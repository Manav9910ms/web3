import {NextResponse} from "next/server";
import {getAdminDb,isFirebaseAdminConfigured} from "@/lib/firebase/admin";
import {DEMO_PRODUCTS} from "@/lib/demo-products";
export const dynamic="force-dynamic";
export async function GET(){
 if(!isFirebaseAdminConfigured())return NextResponse.json({products:DEMO_PRODUCTS,demoMode:true},{headers:{"Cache-Control":"no-store"}});
 try{const snap=await getAdminDb().collection("products").where("isActive","==",true).get();const products=snap.docs.map(doc=>{const d=doc.data(),stock=Math.max(0,Number(d.stockOnHand||0)),reserved=Math.max(0,Number(d.reservedStock||0));return {id:doc.id,name:String(d.name||""),slug:String(d.slug||doc.id),description:String(d.description||""),category:String(d.category||"Other"),imageUrl:String(d.imageUrl||""),pricePaise:Math.max(0,Number(d.pricePaise||0)),unitLabel:String(d.unitLabel||"piece"),stockOnHand:stock,reservedStock:reserved,availableStock:Math.max(0,stock-reserved),lowStockThreshold:Math.max(0,Number(d.lowStockThreshold||0)),isActive:d.isActive===true};}).sort((a,b)=>a.name.localeCompare(b.name));return NextResponse.json({products,demoMode:false},{headers:{"Cache-Control":"no-store"}});}
 catch(e){console.error("Catalog read failed",e);return NextResponse.json({error:"Catalog unavailable. Check Firebase server configuration."},{status:503});}
}