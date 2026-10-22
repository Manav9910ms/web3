type Job={channel:"sms"|"whatsapp";phone:string;orderNumber:string;deliveryDate:string;totalPaise:number};
export async function sendNotification(j:Job){
 const money="Rs. "+(j.totalPaise/100).toFixed(2),message="MyShop order "+j.orderNumber+" is confirmed. Total: "+money+". Home delivery is scheduled for Saturday, "+j.deliveryDate+".";
 if(j.channel==="sms"){
  const url=process.env.SMS_API_URL,token=process.env.SMS_API_TOKEN;if(!url||!token||!process.env.SMS_TEMPLATE_ID)throw new Error("SMS provider credentials or approved template not configured.");
  const r=await fetch(url,{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({to:j.phone,message,sender:process.env.SMS_SENDER_ID||"",templateId:process.env.SMS_TEMPLATE_ID}),cache:"no-store"});if(!r.ok)throw new Error("SMS provider HTTP "+r.status);return;
 }
 const token=process.env.WHATSAPP_ACCESS_TOKEN,id=process.env.WHATSAPP_PHONE_NUMBER_ID,template=process.env.WHATSAPP_ORDER_TEMPLATE;if(!token||!id||!template)throw new Error("WhatsApp Cloud API or approved template not configured.");
 const version=process.env.WHATSAPP_GRAPH_VERSION||"v22.0";
 const r=await fetch("https://graph.facebook.com/"+version+"/"+id+"/messages",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",to:j.phone.replace(/[^0-9]/g,""),type:"template",template:{name:template,language:{code:process.env.WHATSAPP_TEMPLATE_LANGUAGE||"en"},components:[{type:"body",parameters:[{type:"text",text:j.orderNumber},{type:"text",text:j.deliveryDate},{type:"text",text:money}]}]}}),cache:"no-store"});if(!r.ok)throw new Error("WhatsApp API HTTP "+r.status);
}