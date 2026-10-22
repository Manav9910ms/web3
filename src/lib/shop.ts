import type {ShopSettings} from "@/lib/types";
import {getAdminDb,isFirebaseAdminConfigured} from "@/lib/firebase/admin";
export const DEFAULT_SETTINGS:ShopSettings={shopName:"MyShop",timezone:"Asia/Kolkata",cutoffDayOfWeek:5,cutoffHour:18,cutoffMinute:0,deliveryDayOfWeek:6,deliveryPincodes:[],deliveryFeePaise:0,minOrderPaise:0,ordersEnabled:true,maxOrdersPerDeliveryDate:100};
export async function getShopSettings():Promise<ShopSettings>{
 if(!isFirebaseAdminConfigured())return DEFAULT_SETTINGS;
 const doc=await getAdminDb().collection("shopSettings").doc("main").get();if(!doc.exists)return DEFAULT_SETTINGS;
 const d=doc.data()||{};return {...DEFAULT_SETTINGS,...d,deliveryPincodes:Array.isArray(d.deliveryPincodes)?d.deliveryPincodes.map(String):[]} as ShopSettings;
}
function parts(date:Date,zone:string){
 const a=new Intl.DateTimeFormat("en-GB",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date),n=(k:string)=>Number(a.find(x=>x.type===k)?.value||0),year=n("year"),month=n("month"),day=n("day");
 return {year,month,day,hour:n("hour"),minute:n("minute"),weekday:new Date(Date.UTC(year,month-1,day)).getUTCDay()};
}
export function getNextDeliveryDate(now:Date,s:ShopSettings=DEFAULT_SETTINGS){
 const c=parts(now,s.timezone||"Asia/Kolkata");let diff=(s.deliveryDayOfWeek-c.weekday+7)%7;
 const late=c.weekday===s.cutoffDayOfWeek&&(c.hour>s.cutoffHour||(c.hour===s.cutoffHour&&c.minute>=s.cutoffMinute));
 if(c.weekday===s.deliveryDayOfWeek||late)diff+=7;
 const d=new Date(Date.UTC(c.year,c.month-1,c.day+diff));return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0")+"-"+String(d.getUTCDate()).padStart(2,"0");
}
export function formatDate(date:string,zone="Asia/Kolkata"){return new Intl.DateTimeFormat("en-IN",{timeZone:zone,weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date(date+"T12:00:00Z"));}