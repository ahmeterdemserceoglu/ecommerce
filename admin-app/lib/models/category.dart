class Category {
  final String id;
  final String name;
  final String? description;
  final String? imageUrl;
  // Gerekirse parentId, slug gibi alanlar eklenebilir

  Category({
    required this.id,
    required this.name,
    this.description,
    this.imageUrl,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      imageUrl: json['imageUrl'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'imageUrl': imageUrl,
    };
  }
}
