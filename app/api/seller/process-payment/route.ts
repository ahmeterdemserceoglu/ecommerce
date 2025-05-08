import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    const body = await request.json()
    const { orderId, storeId, amount, provider, customerId } = body

    // Validate required fields
    if (!orderId || !storeId || !amount || !provider || !customerId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get the payment integration for this store and provider
    const { data: integration, error: integrationError } = await supabase
      .from("payment_integrations")
      .select("*")
      .eq("store_id", storeId)
      .eq("provider", provider)
      .eq("is_active", true)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json({ error: "Payment integration not found or inactive" }, { status: 404 })
    }

    // Create a payment transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from("payment_transactions")
      .insert({
        order_id: orderId,
        store_id: storeId,
        integration_id: integration.id,
        amount,
        currency: "TRY",
        status: "pending",
        provider,
        customer_id: customerId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (transactionError) {
      return NextResponse.json({ error: "Failed to create payment transaction" }, { status: 500 })
    }

    // Process payment based on provider
    let paymentResponse

    switch (provider) {
      case "paytr":
        paymentResponse = await processPaytrPayment(integration.config, transaction.id, amount, orderId, customerId)
        break
      case "stripe":
        paymentResponse = await processStripePayment(integration.config, transaction.id, amount, orderId, customerId)
        break
      case "iyzico":
        paymentResponse = await processIyzicoPayment(integration.config, transaction.id, amount, orderId, customerId)
        break
      default:
        return NextResponse.json({ error: "Unsupported payment provider" }, { status: 400 })
    }

    // Update the transaction with the provider response
    await supabase
      .from("payment_transactions")
      .update({
        provider_response: paymentResponse,
        provider_transaction_id: paymentResponse.transaction_id,
        status: paymentResponse.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id)

    return NextResponse.json({
      success: true,
      transaction_id: transaction.id,
      payment_url: paymentResponse.payment_url,
      status: paymentResponse.status,
    })
  } catch (error: any) {
    console.error("Payment processing error:", error)
    return NextResponse.json(
      {
        error: "Payment processing failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

// Mock implementation of payment processors
// In a real application, these would integrate with the actual payment gateways

async function processPaytrPayment(
  config: any,
  transactionId: string,
  amount: number,
  orderId: string,
  customerId: string,
) {
  // This is a mock implementation
  // In a real application, you would integrate with PayTR API

  return {
    transaction_id: `paytr_${Date.now()}`,
    status: "pending",
    payment_url: `https://www.paytr.com/odeme/guvenli/${transactionId}`,
    message: "Payment initiated successfully",
  }
}

async function processStripePayment(
  config: any,
  transactionId: string,
  amount: number,
  orderId: string,
  customerId: string,
) {
  // This is a mock implementation
  // In a real application, you would integrate with Stripe API

  return {
    transaction_id: `stripe_${Date.now()}`,
    status: "pending",
    payment_url: `https://checkout.stripe.com/pay/${transactionId}`,
    message: "Payment initiated successfully",
  }
}

async function processIyzicoPayment(
  config: any,
  transactionId: string,
  amount: number,
  orderId: string,
  customerId: string,
) {
  // This is a mock implementation
  // In a real application, you would integrate with iyzico API

  return {
    transaction_id: `iyzico_${Date.now()}`,
    status: "pending",
    payment_url: `https://sandbox-api.iyzipay.com/payment/pay/${transactionId}`,
    message: "Payment initiated successfully",
  }
}
