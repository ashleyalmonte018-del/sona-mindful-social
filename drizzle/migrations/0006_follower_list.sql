-- Follower list RPC for the profile follower-count popup.
-- Applied via SQL editor; recorded here so repo history matches the database.

CREATE OR REPLACE FUNCTION public.followers_list(_owner uuid)
 RETURNS TABLE(id uuid, display_name text, handle text, avatar_path text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.display_name, p.handle, p.avatar_path
  FROM public.follows f
  JOIN public.profiles p ON p.id = f.follower_id
  WHERE f.following_id = _owner
    AND f.status = 'approved'
    AND (
      _owner = auth.uid()
      OR COALESCE((SELECT is_public FROM public.profiles WHERE id = _owner), false)
      OR (SELECT private_hides FROM public.profiles WHERE id = _owner) = 'posts'
      OR public.is_approved_follower(_owner, auth.uid())
    )
  ORDER BY p.display_name
  LIMIT 100
$function$;

REVOKE EXECUTE ON FUNCTION public.followers_list(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.followers_list(uuid) TO authenticated;
