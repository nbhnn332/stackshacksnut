import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPhonePeOrderStatus, verifyPhonePeWebhookAuth } from '@/lib/phonepe';
import { generateInvoiceHTML } from '@/lib/invoice';
import { sendEmail } from '@/lib/resend';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const authHeader = req.headers.get('authorization');
    
    const settings = await db.getSettings();

    // Determine order ID from V2 payload
    let gatewayOrderId: string | undefined;
    let decodedResponse: any = data;

    // Checkout V2 webhook payload
    if (authHeader && settings.phonepeClientId && settings.phonepeClientSecret) {
      const isAuthValid = verifyPhonePeWebhookAuth(
        authHeader,
        settings.phonepeClientId,
        settings.phonepeClientSecret
      );
      if (!isAuthValid && authHeader !== `O-Bearer ${settings.phonepeClientSecret}`) {
        // Log warning if webhook basic auth did not match configured credentials
        console.warn('PhonePe Webhook Auth mismatch');
      }
    }
    gatewayOrderId =
      data.merchantOrderId ||
      data.merchantTransactionId ||
      data.data?.merchantOrderId ||
      data.data?.merchantTransactionId;

    if (!gatewayOrderId) {
      return NextResponse.json({ error: 'Order ID missing in payload' }, { status: 400 });
    }

    let providerRefId =
      decodedResponse.transactionId ||
      decodedResponse.providerReferenceId ||
      decodedResponse.data?.transactionId ||
      decodedResponse.data?.providerReferenceId ||
      decodedResponse.data?.paymentInstrument?.pgTransactionId ||
      "";

    // Verify real-time status via authoritative Check Order Status API if credentials present
    let isPaymentSuccess = false;
    try {
      if (settings.phonepeClientId && settings.phonepeClientSecret) {
        const statusResponse = await checkPhonePeOrderStatus(gatewayOrderId, settings);
        const state = statusResponse?.state || statusResponse?.data?.state || statusResponse?.code;
        isPaymentSuccess = state === 'COMPLETED' || state === 'PAYMENT_SUCCESS';
        providerRefId =
          statusResponse?.data?.paymentInstrument?.pgTransactionId ||
          statusResponse?.data?.transactionId ||
          statusResponse?.transactionId ||
          providerRefId;
      } else {
        isPaymentSuccess =
          decodedResponse.code === 'PAYMENT_SUCCESS' ||
          decodedResponse.state === 'COMPLETED' ||
          decodedResponse.state === 'PAYMENT_SUCCESS';
      }
    } catch (statusCheckError) {
      console.warn('PhonePe status API check failed, falling back to payload status:', statusCheckError);
      isPaymentSuccess =
        decodedResponse.code === 'PAYMENT_SUCCESS' ||
        decodedResponse.state === 'COMPLETED' ||
        decodedResponse.state === 'PAYMENT_SUCCESS';
    }

    if (isPaymentSuccess) {
      const updatedOrder = await db.updateOrderPaymentStatusByGatewayId(gatewayOrderId, "PAID", providerRefId);
      
      if (updatedOrder && updatedOrder.email) {
        try {
          const productsList = await db.getProducts();
          const productMap = Object.fromEntries(productsList.map((p) => [p.id, p]));
          const invoiceHtml = generateInvoiceHTML(updatedOrder, productMap);
          await sendEmail(
            updatedOrder.email, 
            `Stack Shack Order Confirmation #${updatedOrder.invoiceNumber || updatedOrder.id.substring(0, 8)}`, 
            invoiceHtml
          );
        } catch (e) {
          console.error("Failed to send PhonePe order confirmation email", e);
        }
      }
    } else {
      await db.updateOrderPaymentStatusByGatewayId(gatewayOrderId, "FAILED", providerRefId);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('PhonePe callback error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
