import { useEffect, useState } from 'react';
import { supabaseBrowserClient } from '@/supabase/supabaseClient';
import { EncryptionService } from '@/lib/encryption';

export const useChatFile = (filePath: string, fileHMAC: string | null) => {
  const [publicUrl, setPublicUrl] = useState('');
  const [fileType, setFileType] = useState('');
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

          if (filePath.startsWith('chat/img-')) {
            setFileType('image');
          } else if (filePath.startsWith('chat/pdf-')) {
            setFileType('pdf');
          }

          if (fileHMAC) {
            const response = await fetch(publicUrl);
            const blob = await response.blob();
            const file = new File([blob], filePath.split('/').pop() || 'file');
            
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

  return { publicUrl, fileType, loading, error, isVerified };
};