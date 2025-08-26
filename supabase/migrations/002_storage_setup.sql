-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
('tracks', 'tracks', FALSE),
('avatars', 'avatars', TRUE);

-- Storage policies for 'tracks' bucket
CREATE POLICY "Users can upload their own tracks" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'tracks' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own tracks" ON storage.objects
FOR SELECT USING (
    bucket_id = 'tracks' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public can view public tracks" ON storage.objects
FOR SELECT USING (bucket_id = 'tracks');

-- Storage policies for 'avatars' bucket (public)
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);