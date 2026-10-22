import type {Product} from "@/lib/types";
const rows=[
["Everyday Rice","everyday-rice","Staples","Rice for everyday family meals.",7200,"5 kg",18,"https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=85"],
["Whole Wheat Atta","whole-wheat-atta","Staples","Whole wheat flour for rotis.",2650,"2 kg",14,"https://images.unsplash.com/photo-1627485937980-221c88ac04f9?auto=format&fit=crop&w=900&q=85"],
["Fresh Milk","fresh-milk","Dairy","A sample listing for a daily essential.",3200,"1 litre",12,"https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=900&q=85"],
["Sunflower Oil","sunflower-oil","Cooking","Cooking oil for your kitchen.",14800,"5 litre",7,"https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=85"],
["Toor Dal","toor-dal","Staples","A pantry staple for everyday meals.",9800,"2 kg",9,"https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=900&q=85"],
["Tea Leaves","tea-leaves","Beverages","Tea for morning and evening chai.",14500,"1 kg",5,"https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=85"],
["Bath Soap","bath-soap","Personal care","Daily-use personal care essential.",3800,"pack of 4",22,"https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=900&q=85"],
["Dishwashing Liquid","dishwashing-liquid","Home care","Everyday kitchen cleaning essential.",6500,"500 ml",6,"https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=900&q=85"]
] as const;
export const DEMO_PRODUCTS:Product[]=rows.map((r,i)=>({id:"demo-"+(i+1),name:r[0],slug:r[1],category:r[2],description:r[3],pricePaise:r[4],unitLabel:r[5],stockOnHand:r[6],reservedStock:0,availableStock:r[6],lowStockThreshold:3,imageUrl:r[7],isActive:true}));