import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "../../../../lib/firebase-admin";

export const runtime = "nodejs";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
}

export async function GET(request: Request) {
  try {
    const { db } = await requireAdmin(request);
    const snapshot = await db.collection("products").get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ products });
  } catch (error) {
    const message=error instanceof Error?error.message:"Admin access required.";
    return NextResponse.json({error:message},{status:message.includes("required")||message.includes("Admin")?403:500});
  }
}

export async function POST(request: Request) {
  try {
    const { db } = await requireAdmin(request);
    const body = await request.json();
    const name=String(body.name||"").trim();
    const price=Number(body.price);
    const costPrice=Number(body.costPrice||0);
    const stock=Number(body.stock||0);
    const category=String(body.category||"General").trim();

    if(!name||!Number.isFinite(price)||price<=0||!Number.isFinite(costPrice)||costPrice<0||!Number.isInteger(stock)||stock<0){
      return NextResponse.json({error:"Invalid product fields."},{status:400});
    }

    const slug=String(body.slug||slugify(name));
    const duplicate=await db.collection("products").where("slug","==",slug).limit(1).get();
    if(!duplicate.empty) return NextResponse.json({error:"A product with this slug already exists."},{status:409});

    const ref=await db.collection("products").add({
      slug,
      name,
      shortDescription:String(body.shortDescription||""),
      description:String(body.description||""),
      price,
      compareAtPrice:body.compareAtPrice==null||body.compareAtPrice===""?null:Number(body.compareAtPrice),
      costPrice,
      sourceType:body.sourceType==="resell"?"resell":"own",
      supplier:String(body.supplier||""),
      supplierUrl:String(body.supplierUrl||""),
      sku:String(body.sku||("SKU-"+Date.now())),
      category,
      images:Array.isArray(body.images)?body.images.filter(Boolean).map(String):[],
      stock,
      active:body.active!==false,
      featured:Boolean(body.featured),
      tags:Array.isArray(body.tags)?body.tags.map(String):[],
      createdAt:FieldValue.serverTimestamp(),
      updatedAt:FieldValue.serverTimestamp()
    });
    return NextResponse.json({ok:true,id:ref.id});
  } catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Could not create product."},{status:500});
  }
}

export async function PATCH(request: Request) {
  try {
    const { db } = await requireAdmin(request);
    const body = await request.json();
    const id=String(body.id||"");
    if(!id) return NextResponse.json({error:"Product id is required."},{status:400});
    const allowed=["slug","name","shortDescription","description","price","compareAtPrice","costPrice","sourceType","supplier","supplierUrl","sku","category","images","stock","active","featured","tags"];
    const patch:Record<string,unknown>={};
    for(const key of allowed) if(key in body) patch[key]=body[key];
    if("sourceType" in patch) patch.sourceType=patch.sourceType==="resell"?"resell":"own";
    patch.updatedAt=FieldValue.serverTimestamp();
    await db.collection("products").doc(id).update(patch);
    return NextResponse.json({ok:true});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Could not update product."},{status:500});
  }
}

export async function DELETE(request: Request) {
  try{
    const {db}=await requireAdmin(request);
    const body=await request.json();
    const id=String(body.id||"");
    if(!id) return NextResponse.json({error:"Product id is required."},{status:400});
    await db.collection("products").doc(id).delete();
    return NextResponse.json({ok:true});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Could not delete product."},{status:500});
  }
}
