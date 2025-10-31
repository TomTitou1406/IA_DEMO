import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kb_specialty = searchParams.get('specialty'); // 'acquisition_entreprise'
  
  const supabase = createRouteHandlerClient({ cookies });
  
  const { data, error } = await supabase
    .from('knowledge_bases_pool')
    .select('*')
    .eq('kb_type', 'statique')
    .eq('kb_specialty', kb_specialty)
    .eq('status', 'active')
    .single();
  
  if (error || !data) {
    return NextResponse.json(
      { error: 'KB non trouvée' },
      { status: 404 }
    );
  }
  
  return NextResponse.json({ kb: data });
}
