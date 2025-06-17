
-- Replace this with your new admin's email if you made a new admin!
update user_profiles 
set is_admin = true
where user_id = (select id from auth.users where email = 'admin@vsc.example.com');
