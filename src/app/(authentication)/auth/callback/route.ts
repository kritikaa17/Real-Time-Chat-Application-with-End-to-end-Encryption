'use server';

import { EncryptionService } from "@/lib/encryption";
import { createServerClient } from "@supabase/ssr";
import { CookieOptions } from "express";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    try {
      const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) throw error;

      if (session?.user?.email) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, public_key')
          .eq('email', session.user.email)
          .single();

        if (!existingUser?.public_key) {
          const { publicKey, privateKey } = EncryptionService.generateRSAKeyPair();
          const aesKey = EncryptionService.generateAESKey();
          const { encryptedPrivateKey, iv } = EncryptionService.encryptPrivateKey(privateKey, aesKey);

          const userData = {
            email: session.user.email,
            public_key: publicKey,
            encrypted_private_key: encryptedPrivateKey,
            iv: iv,
            aes_key: aesKey.toString('base64'),
            type: 'user',
            is_away: false, // Set is_away to false on login
            created_at: new Date().toISOString()
          };

          if (existingUser?.id) {
            // Update existing user
            const { error: updateError } = await supabase
              .from('users')
              .update({
                ...userData,
                is_away: false // Explicitly set is_away to false
              })
              .eq('id', existingUser.id)
              .select();

            if (updateError) throw updateError;
          } else {
            // Insert new user
            const { error: insertError } = await supabase
              .from('users')
              .insert([userData])
              .select();

            if (insertError) throw insertError;
          }
        } else {
          // For existing users with public key, update is_away to false
          const { error: updateError } = await supabase
            .from('users')
            .update({ is_away: false })
            .eq('id', existingUser.id)
            .select();

          if (updateError) throw updateError;
        }
      }

      return NextResponse.redirect(`${origin}`);
    } catch (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(`${origin}/auth/auth-code-error`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}