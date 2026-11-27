// Vercel Serverless Function - M-Pesa calls this
export default async function handler(req,res){
  const data = req.body?.Body?.stkCallback || req.body;
  const code = data?.CallbackMetadata?.Item?.find(i=>i.Name==='MpesaReceiptNumber')?.Value || null;
  const amount = data?.CallbackMetadata?.Item?.find(i=>i.Name==='Amount')?.Value || 0;
  const phone = data?.CallbackMetadata?.Item?.find(i=>i.Name==='PhoneNumber')?.Value || '';
  const status = data?.ResultCode===0 ? 'PAID' : 'FAILED';

  // Save to Supabase
  await fetch(process.env.SUPABASE_URL+"/rest/v1/payments",{
    method:"POST",
    headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:"Bearer "+process.env.SUPABASE_SERVICE_ROLE_KEY,"Content-Type":"application/json",Prefer:"return=minimal"},
    body:JSON.stringify({phone:String(phone),amount:Number(amount),mpesa_receipt:code,status,business_name:"Advertise"})
  });
  res.status(200).json({ok:true});
}
