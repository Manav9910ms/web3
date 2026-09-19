import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!process.env.FIREBASE_ADMIN_PROJECT_ID || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL || !process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
  throw new Error("Set Firebase Admin environment variables before running the seed script.");
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g,"\n")
    })
  });
}

const db=getFirestore();
const products=[
  {id:"mug-001",slug:"minimal-ceramic-mug",name:"Minimal Ceramic Mug",shortDescription:"A clean everyday mug for coffee, tea and desk setups.",description:"Simple, durable and easy to pair with any kitchen or office setup.",price:349,compareAtPrice:499,costPrice:185,sourceType:"own",supplier:"",supplierUrl:"",sku:"OWN-MUG-001",category:"Home",images:[],stock:24,active:true,featured:true,tags:["mug","coffee","home"]},
  {id:"lamp-001",slug:"ambient-desk-lamp",name:"Ambient Desk Lamp",shortDescription:"Compact warm-light lamp for work and study corners.",description:"A modern desk lamp designed for late-night work, study sessions and cozy rooms.",price:799,compareAtPrice:1199,costPrice:430,sourceType:"resell",supplier:"Meesho",supplierUrl:"",sku:"MSH-LAMP-001",category:"Workspace",images:[],stock:15,active:true,featured:true,tags:["lamp","desk","study"]},
  {id:"organizer-001",slug:"cable-desk-organizer",name:"Cable Desk Organizer",shortDescription:"Keep chargers and cables tidy around your workspace.",description:"A practical desk organizer for charging cables, earbuds and everyday accessories.",price:249,compareAtPrice:399,costPrice:110,sourceType:"resell",supplier:"Meesho",supplierUrl:"",sku:"MSH-ORG-001",category:"Workspace",images:[],stock:48,active:true,featured:false,tags:["cable","organizer","desk"]},
  {id:"bottle-001",slug:"steel-water-bottle",name:"Steel Water Bottle",shortDescription:"Reusable stainless-steel bottle for daily carry.",description:"A lightweight reusable bottle for college, office, travel and daily routines.",price:599,compareAtPrice:799,costPrice:275,sourceType:"own",supplier:"",supplierUrl:"",sku:"OWN-BTL-001",category:"Lifestyle",images:[],stock:32,active:true,featured:true,tags:["bottle","steel","travel"]}
];

for (const product of products) {
  await db.collection("products").doc(product.id).set({...product,updatedAt:new Date()},{merge:true});
}
console.log("Seeded",products.length,"products.");
