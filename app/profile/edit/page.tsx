import RequireAuth from '@/components/auth/RequireAuth';
import ProfileEditPageClient from '@/components/profile/ProfileEditPageClient';

export default function ProfileEditPage() {
  return (
    <RequireAuth>
      <ProfileEditPageClient />
    </RequireAuth>
  );
}
