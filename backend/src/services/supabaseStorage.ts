import supabase from '../config/supabase';

export const downloadFromSupabase = async (
  path: string,
  bucket: string = 'dump'
): Promise<Buffer> => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(path);

  if (error) {
    throw new Error(`Failed to download from Supabase: ${error.message}`);
  }

  return Buffer.from(await data.arrayBuffer());
};

export const uploadToSupabase = async (
  file: Buffer,
  filename: string,
  bucket: string = 'dump'
): Promise<{ path: string; url: string }> => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload to Supabase: ${error.message}`);
  }

  const { data: publicUrl } = await supabase.storage
    .from(bucket)
    .getPublicUrl(filename);

  return {
    path: data.path,
    url: publicUrl.publicUrl
  };
};

export const deleteFromSupabase = async (
  filename: string,
  bucket: string = 'dump'
): Promise<void> => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([filename]);

  if (error) {
    throw new Error(`Failed to delete from Supabase: ${error.message}`);
  }
};

export const getPublicUrl = async (
  filename: string,
  bucket: string = 'dump'
): Promise<string> => {
  const { data } = await supabase.storage
    .from(bucket)
    .getPublicUrl(filename);

  return data.publicUrl;
};
