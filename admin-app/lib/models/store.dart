class Store {
  final String id;
  final String name;
  final String? description;
  final String userId;
  final String? userName;
  final String? userEmail;
  final String status;
  final String? logo;
  final String? banner;
  final String? slug;
  final String address;
  final Map<String, dynamic>? contactInfo;
  final Map<String, dynamic>? socialLinks;
  final DateTime createdAt;
  final DateTime updatedAt;
  final Map<String, dynamic>? metadata;

  Store({
    required this.id,
    required this.name,
    this.description,
    required this.userId,
    this.userName,
    this.userEmail,
    required this.status,
    this.logo,
    this.banner,
    this.slug,
    required this.address,
    this.contactInfo,
    this.socialLinks,
    required this.createdAt,
    required this.updatedAt,
    this.metadata,
  });

  factory Store.fromJson(Map<String, dynamic> json) {
    return Store(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      userId: json['userId'],
      userName: json['userName'],
      userEmail: json['userEmail'],
      status: json['status'] ?? 'pending',
      logo: json['logo'],
      banner: json['banner'],
      slug: json['slug'],
      address: json['address'],
      contactInfo: json['contactInfo'],
      socialLinks: json['socialLinks'],
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
      metadata: json['metadata'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'userId': userId,
      'status': status,
      'logo': logo,
      'banner': banner,
      'slug': slug,
      'address': address,
      'contactInfo': contactInfo,
      'socialLinks': socialLinks,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'metadata': metadata,
    };
  }

  Store copyWith({
    String? id,
    String? name,
    String? description,
    String? userId,
    String? userName,
    String? userEmail,
    String? status,
    String? logo,
    String? banner,
    String? slug,
    String? address,
    Map<String, dynamic>? contactInfo,
    Map<String, dynamic>? socialLinks,
    DateTime? createdAt,
    DateTime? updatedAt,
    Map<String, dynamic>? metadata,
  }) {
    return Store(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      userId: userId ?? this.userId,
      userName: userName ?? this.userName,
      userEmail: userEmail ?? this.userEmail,
      status: status ?? this.status,
      logo: logo ?? this.logo,
      banner: banner ?? this.banner,
      slug: slug ?? this.slug,
      address: address ?? this.address,
      contactInfo: contactInfo ?? this.contactInfo,
      socialLinks: socialLinks ?? this.socialLinks,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      metadata: metadata ?? this.metadata,
    );
  }
}
