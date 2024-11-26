'use server';

import { supabaseServerClient } from '@/supabase/supabaseServer';
import { EncryptionService } from '@/lib/encryption';
import { cookies } from 'next/headers';

export async function registerWithEmail({ email }: { email: string }) {
  const supabase = await supabaseServerClient();
  
  try {
    // Generate RSA key pair
    const keyPair = EncryptionService.generateRSAKeyPair();
    const aesKey = EncryptionService.generateAESKey();
    const { encryptedPrivateKey, iv } = EncryptionService.encryptPrivateKey(keyPair.privateKey, aesKey);

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, public_key')
      .eq('email', email)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking existing user:', fetchError);
      throw fetchError;
    }

    const userData = {
      email,
      public_key: keyPair.publicKey,
      encrypted_private_key: encryptedPrivateKey,
      iv,
      aes_key: aesKey.toString('base64'),
      type: 'user',
      created_at: new Date().toISOString(),
      is_away: false
    };

    if (!existingUser) {
      // Insert new user - UUID will be auto-generated
      const { error: insertError } = await supabase
        .from('users')
        .insert([userData])
        .select();

      if (insertError) {
        console.error('Error inserting user data:', insertError);
        throw insertError;
      }
      console.log('New user profile created successfully');
    } else if (!existingUser.public_key) {
      // Update existing user with keys
      const { error: updateError } = await supabase
        .from('users')
        .update(userData)
        .eq('id', existingUser.id)
        .select();

      if (updateError) {
        console.error('Error updating user data:', updateError);
        throw updateError;
      }
      console.log('Existing user profile updated successfully');
    }

    // Send OTP email
    const response = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_CURRENT_ORIGIN,
      },
    });

    return JSON.stringify(response);
  } catch (error) {
    console.error('Registration error:', error);
    return JSON.stringify({ error: 'Registration failed: ' + error });
  }
}
