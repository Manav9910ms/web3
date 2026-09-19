import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/firebase-admin";
import { releaseInventory } from "../../../../lib/inventory";
import type { OrderStatus } from "../../../../lib/types";

function jsonDate(value: unknown){
  if(value&&typeof value==="object"&&"toDate" in value&&typeof (value as {toDate:()=>Date}).toDate==="function"){
    return (value as {toDate:()=>Date}).toDate().toISOString();
  }
  if(typeof value==="string") return value;
  return new Date().toISOString();
}

export async function GET(request: Request){
  try{
    const {db}=await requireAdmin(request);
    const snapshot=await db.collection("orders").get();
    const orders=await Promise.all(snapshot.docs.map(async doc=>{
      const data=doc.data();
      const finance=await db.collection("order_finance").doc(doc.id).get();
      return {id:doc.id,...data,createdAt:jsonDate(data.createdAt),finance:finance.exists?finance.data():null};
    }));
    orders.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
    return NextResponse.json({orders});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Could not load orders."},{status:500});
  }
}

export async function PATCH(request: Request){
  try{
    const {db}=await requireAdmin(request);
    const body=await request.json();
    const orderStatus=String(body.orderStatus||"") as OrderStatus;
    const valid:OrderStatus[]=["pending_payment","paid","processing","shipped","delivered","cancelled"];
    if(!valid.includes(orderStatus)) return NextResponse.json({error:"Invalid order status."},{status:400});
    const id=String(body.id||"");
    if(!id) return NextResponse.json({error:"Order id is required."},{status:400});

    const orderRef=db.collection("orders").doc(id);
    const orderSnap=await orderRef.get();
    if(!orderSnap.exists) return NextResponse.json({error:"Order not found."},{status:404});
    const before=orderSnap.data()||{};

    await orderRef.update({orderStatus,updatedAt:new Date()});

    if(orderStatus==="cancelled" && before.paymentStatus!=="paid"){
      await releaseInventory(db,id);
    }

    return NextResponse.json({ok:true});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Could not update order."},{status:500});
  }
}
