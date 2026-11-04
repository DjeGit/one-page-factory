import { NextResponse } from 'next/server';

export async function POST() {
  // 303 (et non 307, défaut de NextResponse.redirect) : après un POST, le
  // navigateur doit suivre la redirection en GET. Avec 307 il renvoyait un
  // POST vers /admin. Le Location est relatif : il reste sur le domaine du
  // back-office, au lieu de NEXT_PUBLIC_SITE_URL qui peut désigner un domaine
  // Tendpick où /admin n'existe pas.
  const response = new NextResponse(null, { status: 303, headers: { Location: '/admin' } });
  response.cookies.delete('admin_auth');
  return response;
}
