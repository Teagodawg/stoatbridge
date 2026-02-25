
-- Add input validation to handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, discord_id, discord_username, discord_avatar)
  VALUES (
    NEW.id,
    substring((NEW.raw_user_meta_data ->> 'provider_id'), 1, 100),
    substring(COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      NEW.raw_user_meta_data ->> 'user_name',
      'User'
    ), 1, 100),
    substring((NEW.raw_user_meta_data ->> 'avatar_url'), 1, 500)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
