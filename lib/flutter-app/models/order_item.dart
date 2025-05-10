class OrderItem {
  final String id;
  final String productId;
  final String productTitle;
  final int quantity;
  final double price;
  final double total;
  final String? imageUrl;
  final String? storeId;
  final String? storeName;
  final Map<String, dynamic>? variant;

  OrderItem({
    required this.id,
    required this.productId,
    required this.productTitle,
    required this.quantity,
    required this.price,
    required this.total,
    this.imageUrl,
    this.storeId,
    this.storeName,
    this.variant,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: json['id'],
      productId: json['productId'],
      productTitle: json['productTitle'],
      quantity: json['quantity'],
      price: (json['price'] as num).toDouble(),
      total: (json['total'] as num).toDouble(),
      imageUrl: json['imageUrl'],
      storeId: json['storeId'],
      storeName: json['storeName'],
      variant: json['variant'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'productId': productId,
      'productTitle': productTitle,
      'quantity': quantity,
      'price': price,
      'total': total,
      'imageUrl': imageUrl,
      'storeId': storeId,
      'storeName': storeName,
      'variant': variant,
    };
  }
}
