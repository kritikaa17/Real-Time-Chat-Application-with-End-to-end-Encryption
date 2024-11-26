import { useEffect, useState } from 'react';
import { supabaseBrowserClient } from '@/supabase/supabaseClient';
import { EncryptionService } from '@/lib/encryption';

export const useVoiceFile = (filePath: string, fileHMAC: string | null) => {
  const [publicUrl, setPublicUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  const supabase = supabaseBrowserClient;

  useEffect(() => {
    const fetchAndVerifyFile = async () => {
      try {
        const {
          data: { publicUrl },
        } = await supabase.storage.from('chat-files').getPublicUrl(filePath);

        if (publicUrl) {
          setPublicUrl(publicUrl);

          if (fileHMAC) {
            const response = await fetch(publicUrl);
            const blob = await response.blob();
            const file = new File([blob], filePath.split('/').pop() || 'voice');
            
            // Use a consistent HMAC key - in production, this should be securely stored
            const hmacKey = Buffer.from(process.env.NEXT_PUBLIC_HMAC_KEY || '', 'hex');
            const verified = await EncryptionService.verifyFileHMAC(file, fileHMAC, hmacKey);
            setIsVerified(verified);
          }
        }
      } catch (error: any) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    if (filePath) {
      fetchAndVerifyFile();
    }
  }, [filePath, fileHMAC, supabase.storage]);

  return { publicUrl, loading, error, isVerified };
};