UPDATE games
SET public_id = lower(hex(randomblob(16)))
WHERE public_id IS NULL OR trim(public_id) = '';
