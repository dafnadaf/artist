class PaymentProvider {
  async createPayment() {
    throw new Error("createPayment is not implemented");
  }

  async handleWebhook() {
    throw new Error("handleWebhook is not implemented");
  }
}

export default PaymentProvider;
