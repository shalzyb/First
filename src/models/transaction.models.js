const 

const transactionSchema = new mongoose.Schema({
    senderWalletId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Wallet",
        required: true
    },
    receiverWalletId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Wallet",
        required: true
    },
    balanceBefore: {
        type: mongoose.Schema.Types.Decimal128,
        required: true
    },
    balanceAfter: {
        type: mongoose.Schema.Types.Decimal128,
        required: true
    },
    amount: {
        type: mongoose.Schema.Types.Decimal128,
        required: true
    },
    trnxreference: {
        type: String,
        required: true,
        unique: true
    }
}, { timestamps: true, versionKey: false });

const Transaction = mongoose.model("Transaction", transactionSchema);
module.exports = Transaction;