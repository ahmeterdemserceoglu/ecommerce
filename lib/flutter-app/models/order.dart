import 'order_item.dart';

class OrderItem {
  final String productId;
  final String productName;
  final int quantity;
  final double price;
  final String? sku;

  OrderItem({
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.price,
    this.sku,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      productId: json['productId'],
      productName: json['productName'],
      quantity: json['quantity'],
      price: json['price'].toDouble(),
      sku: json['sku'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'productId': productId,
      'productName': productName,
      'quantity': quantity,
      'price': price,
      'sku': sku,
    };
  }

  double get total => price * quantity;
}

class Order {
  final String id;
  final String customerName;
  final String? customerEmail;
  final String? customerPhone;
  final DateTime createdAt;
  final String status;
  final List<OrderItem> items;
  final double subtotal;
  final double totalAmount;
  final double? tax;
  final double? shipping;
  final double? discount;
  final String? paymentMethod;
  final String? paymentStatus;
  final String? shippingAddress;

  Order({
    required this.id,
    required this.customerName,
    this.customerEmail,
    this.customerPhone,
    required this.createdAt,
    required this.status,
    required this.items,
    required this.subtotal,
    required this.totalAmount,
    this.tax,
    this.shipping,
    this.discount,
    this.paymentMethod,
    this.paymentStatus,
    this.shippingAddress,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id'],
      customerName: json['customerName'],
      customerEmail: json['customerEmail'],
      customerPhone: json['customerPhone'],
      createdAt: DateTime.parse(json['createdAt']),
      status: json['status'],
      items: (json['items'] as List)
          .map((item) => OrderItem.fromJson(item))
          .toList(),
      subtotal: json['subtotal'].toDouble(),
      totalAmount: json['totalAmount'].toDouble(),
      tax: json['tax']?.toDouble(),
      shipping: json['shipping']?.toDouble(),
      discount: json['discount']?.toDouble(),
      paymentMethod: json['paymentMethod'],
      paymentStatus: json['paymentStatus'],
      shippingAddress: json['shippingAddress'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'customerName': customerName,
      'customerEmail': customerEmail,
      'customerPhone': customerPhone,
      'createdAt': createdAt.toIso8601String(),
      'status': status,
      'items': items.map((item) => item.toJson()).toList(),
      'subtotal': subtotal,
      'totalAmount': totalAmount,
      'tax': tax,
      'shipping': shipping,
      'discount': discount,
      'paymentMethod': paymentMethod,
      'paymentStatus': paymentStatus,
      'shippingAddress': shippingAddress,
    };
  }

  Order copyWith({
    String? id,
    String? customerName,
    String? customerEmail,
    String? customerPhone,
    DateTime? createdAt,
    String? status,
    List<OrderItem>? items,
    double? subtotal,
    double? totalAmount,
    double? tax,
    double? shipping,
    double? discount,
    String? paymentMethod,
    String? paymentStatus,
    String? shippingAddress,
  }) {
    return Order(
      id: id ?? this.id,
      customerName: customerName ?? this.customerName,
      customerEmail: customerEmail ?? this.customerEmail,
      customerPhone: customerPhone ?? this.customerPhone,
      createdAt: createdAt ?? this.createdAt,
      status: status ?? this.status,
      items: items ?? this.items,
      subtotal: subtotal ?? this.subtotal,
      totalAmount: totalAmount ?? this.totalAmount,
      tax: tax ?? this.tax,
      shipping: shipping ?? this.shipping,
      discount: discount ?? this.discount,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      shippingAddress: shippingAddress ?? this.shippingAddress,
    );
  }
}
