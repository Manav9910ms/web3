import {createHmac,timingSafeEqual} from "node:crypto";
function keys(){const keyId=process.env.RAZORPAY_KEY_ID,keySecret=process.env.RAZORPAY_KEY_SECRET;if(!keyId||!keySecret)throw new Error("Razorpay is not configured.");return {keyId,keySecret};}
function basic(id:string,secret:string){return "Basic "+Buffer.from(id+":"+secret).toString("base64");}
export async function createRazorpayOrder(amount:number,receipt:string,internalId:string){
 const k=keys(),r=await fetch("https://api.razorpay.com/v1/orders",{method:"POST",headers:{Authorization:basic(k.keyId,k.keySecret),"Content-Type":"application/json"},body:JSON.stringify({amount,currency:"INR",receipt:receipt.slice(0,40),notes:{myshopOrderId:internalId}}),cache:"no-store"}),d=await r.json();
 if(!r.ok||!d.id)throw new Error("Razorpay could not create the payment order.");return {id:String(d.id),keyId:k.keyId};
}
function matches(expected:Buffer,hex:string){let received:Buffer;try{received=Buffer.from(hex,"hex");}catch{return false;}return expected.length===received.length&&timingSafeEqual(expected,received);}
export function verifyCheckoutSignature(orderId:string,paymentId:string,signature:string){const secret=process.env.RAZORPAY_KEY_SECRET;if(!secret||!orderId||!paymentId||!signature)return false;return matches(createHmac("sha256",secret).update(orderId+"|"+paymentId).digest(),signature);}
export function verifyWebhookSignature(body:string,signature:string){const secret=process.env.RAZORPAY_WEBHOOK_SECRET;if(!secret||!signature)return false;return matches(createHmac("sha256",secret).update(body).digest(),signature);}
export async function getRazorpayPayment(id:string){
 const k=keys(),r=await fetch("https://api.razorpay.com/v1/payments/"+encodeURIComponent(id),{headers:{Authorization:basic(k.keyId,k.keySecret)},cache:"no-store"}),d=await r.json();
 if(!r.ok)throw new Error("Unable to verify payment status.");return d as {id:string;order_id:string;status:string;amount:number;currency:string};
}
export async function requestFullRefund(paymentId:string,internalId:string){
 const k=keys(),r=await fetch("https://api.razorpay.com/v1/payments/"+encodeURIComponent(paymentId)+"/refund",{method:"POST",headers:{Authorization:basic(k.keyId,k.keySecret),"Content-Type":"application/json"},body:JSON.stringify({notes:{reason:"Checkout reservation expired",myshopOrderId:internalId}}),cache:"no-store"});
 if(!r.ok)throw new Error("Razorpay refund request failed; reconcile this payment in the dashboard.");return r.json();
}