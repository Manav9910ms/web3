import {NextRequest,NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth/server";
import {getAdminStorage} from "@/lib/firebase/admin";
import {randomUUID} from "node:crypto";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 const g=await requireAdmin(req);if(g.response)return g.response;const name=process.env.FIREBASE_STORAGE_BUCKET||process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;if(!name)return NextResponse.json({error:"Configure FIREBASE_STORAGE_BUCKET first."},{status:503});
 const form=await req.formData(),file=form.get("file");if(!(file instanceof File))return NextResponse.json({error:"Choose an image."},{status:400});if(file.size<1||file.size>5*1024*1024)return NextResponse.json({error:"Image must be smaller than 5 MB."},{status:413});
 const extensions:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};if(!extensions[file.type])return NextResponse.json({error:"Only JPG, PNG and WebP images are supported."},{status:415});const path="product-images/"+randomUUID()+"."+extensions[file.type];
 try{const bucket=getAdminStorage().bucket(name),object=bucket.file(path);await object.save(Buffer.from(await file.arrayBuffer()),{resumable:false,metadata:{contentType:file.type,cacheControl:"public, max-age=31536000, immutable"}});await object.makePublic();return NextResponse.json({url:"https://storage.googleapis.com/"+bucket.name+"/"+encodeURIComponent(path).replace(/%2F/g,"/")});}
 catch(e){console.error("Image upload failed",e);return NextResponse.json({error:"Image upload failed. Check Storage bucket public-object configuration."},{status:500});}
}