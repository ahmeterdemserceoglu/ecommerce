class Product {
  final String id;
  final String name;
  final String? description;
  final double price;
  final String? imageUrl;
  final int stock;
  final String? sku;
  final String? category;
  final double? weight;
  final String? categoryId;
  final String? categoryName;
  final String? status;

  Product({
    required this.id,
    required this.name,
    this.description,
    required this.price,
    this.imageUrl,
    required this.stock,
    this.sku,
    this.category,
    this.weight,
    this.categoryId,
    this.categoryName,
    this.status,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      price: (json['price'] as num).toDouble(),
      imageUrl: json['imageUrl'] as String?,
      stock: json['stock'] as int,
      sku: json['sku'] as String?,
      category: json['category'] as String?,
      weight: json['weight']?.toDouble(),
      categoryId: json['categoryId'] as String?,
      categoryName: json['categoryName'] as String?,
      status: json['status'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'price': price,
      'imageUrl': imageUrl,
      'stock': stock,
      'sku': sku,
      'category': category,
      'weight': weight,
      'categoryId': categoryId,
      'categoryName': categoryName,
      'status': status,
    };
  }

  Product copyWith({
    String? id,
    String? name,
    String? description,
    double? price,
    String? imageUrl,
    int? stock,
    String? sku,
    String? category,
    double? weight,
    String? categoryId,
    String? categoryName,
    String? status,
  }) {
    return Product(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      price: price ?? this.price,
      imageUrl: imageUrl ?? this.imageUrl,
      stock: stock ?? this.stock,
      sku: sku ?? this.sku,
      category: category ?? this.category,
      weight: weight ?? this.weight,
      categoryId: categoryId ?? this.categoryId,
      categoryName: categoryName ?? this.categoryName,
      status: status ?? this.status,
    );
  }
}
