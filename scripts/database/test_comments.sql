SELECT 
    col_description('public.tracks'::regclass, (
        SELECT attnum FROM pg_attribute 
        WHERE attrelid = 'public.tracks'::regclass AND attname = 'description'
    )) as tracks_description_comment,
    col_description('public.posts'::regclass, (
        SELECT attnum FROM pg_attribute 
        WHERE attrelid = 'public.posts'::regclass AND attname = 'content'
    )) as posts_content_comment;
