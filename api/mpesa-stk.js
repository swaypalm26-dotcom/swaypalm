// STK Push - triggers M-Pesa popup on customer's phone
export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'POST only'});
  const {phone,business,amount}=req.body;

  // 1. Get Daraja Token
  const auth=Buffer.from(process.env.DARAJA_KEY+":"+process.env.DARAJA_SECRET).toString('base64');
  const t=await fetch("https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",{headers:{Authorization:"Basic "+auth}});
  const {access_token}=await t.json();

  // 2. Build Password
  const ts=new Date().toISOString().replace(/[-T:.Z]/g,'').slice(0,14);
  const pass=Buffer.from(process.env.MPESA_SHORTCODE+process.env.MPESA_PASSKEY+ts).toString('base64');

  // 3. Send STK
  const r=await fetch("https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",{
    method:"POST",
    headers:{Authorization:"Bearer "+access_token,"Content-Type":"application/json"},
    body:JSON.stringify({
      BusinessShortCode:process.env.MPESA_SHORTCODE,
      Password:pass, Timestamp:ts, TransactionType:"CustomerPayBillOnline",
      Amount:Number(amount), PartyA:phone, PartyB:process.env.MPESA_SHORTCODE,
      PhoneNumber:phone, CallBackURL:process.env.SITE_URL+"/api/mpesa-callback",
      AccountReference:business||"SwayPalm", TransactionDesc:"SwayPalm Advertise"
    })
  });
  const j=await r.json();
  res.status(200).json(j);
}
