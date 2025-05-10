import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/category_provider.dart';
import '../models/category.dart';
import '../utils/theme.dart';

class CategoriesScreen extends StatefulWidget {
  const CategoriesScreen({Key? key}) : super(key: key);

  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  @override
  void initState() {
    super.initState();
    // Ekran ilk açıldığında kategorileri yükle
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<CategoryProvider>(context, listen: false).fetchCategories();
    });
  }

  void _showAddCategoryDialog(BuildContext context,
      {Category? categoryToEdit}) {
    final _formKey = GlobalKey<FormState>();
    final _nameController =
        TextEditingController(text: categoryToEdit?.name ?? '');
    final _descriptionController =
        TextEditingController(text: categoryToEdit?.description ?? '');
    final _imageUrlController =
        TextEditingController(text: categoryToEdit?.imageUrl ?? '');

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: Text(categoryToEdit == null
              ? 'Yeni Kategori Ekle'
              : 'Kategoriyi Düzenle'),
          content: Form(
            key: _formKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  TextFormField(
                    controller: _nameController,
                    decoration:
                        const InputDecoration(labelText: 'Kategori Adı'),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Kategori adı boş olamaz.';
                      }
                      return null;
                    },
                  ),
                  TextFormField(
                    controller: _descriptionController,
                    decoration: const InputDecoration(
                        labelText: 'Açıklama (Opsiyonel)'),
                  ),
                  TextFormField(
                    controller: _imageUrlController,
                    decoration: const InputDecoration(
                        labelText: 'Görsel URL (Opsiyonel)'),
                  ),
                ],
              ),
            ),
          ),
          actions: <Widget>[
            TextButton(
              child: const Text('İptal'),
              onPressed: () {
                Navigator.of(ctx).pop();
              },
            ),
            ElevatedButton(
              child: Text(categoryToEdit == null ? 'Ekle' : 'Güncelle'),
              onPressed: () async {
                if (_formKey.currentState!.validate()) {
                  final categoryProvider =
                      Provider.of<CategoryProvider>(context, listen: false);
                  bool success = false;
                  if (categoryToEdit == null) {
                    final newCategory = Category(
                      id: DateTime.now()
                          .toString(), // Geçici ID, backend'den doğru ID gelmeli
                      name: _nameController.text,
                      description: _descriptionController.text,
                      imageUrl: _imageUrlController.text,
                    );
                    success =
                        await categoryProvider.createCategory(newCategory);
                  } else {
                    final updatedCategory = Category(
                      id: categoryToEdit.id,
                      name: _nameController.text,
                      description: _descriptionController.text,
                      imageUrl: _imageUrlController.text,
                    );
                    success =
                        await categoryProvider.updateCategory(updatedCategory);
                  }

                  Navigator.of(ctx).pop(); // Dialog'u kapat

                  if (success) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                          content: Text(categoryToEdit == null
                              ? 'Kategori eklendi!'
                              : 'Kategori güncellendi!')),
                    );
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                          content: Text(categoryProvider.error ??
                              'İşlem başarısız oldu.'),
                          backgroundColor: Colors.red),
                    );
                  }
                }
              },
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final categoryProvider = Provider.of<CategoryProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Kategoriler'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Yeni Kategori Ekle',
            onPressed: () => _showAddCategoryDialog(context),
          ),
        ],
      ),
      body: categoryProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : categoryProvider.error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          categoryProvider.error!,
                          style:
                              const TextStyle(color: Colors.red, fontSize: 16),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 20),
                        ElevatedButton.icon(
                          icon: const Icon(Icons.refresh),
                          label: const Text('Yeniden Dene'),
                          onPressed: () => categoryProvider.fetchCategories(),
                          style: ElevatedButton.styleFrom(
                              backgroundColor: AdminTheme.primary,
                              foregroundColor: Colors.white),
                        ),
                      ],
                    ),
                  ),
                )
              : categoryProvider.categories.isEmpty
                  ? const Center(child: Text('Henüz kategori eklenmemiş.'))
                  : ListView.builder(
                      itemCount: categoryProvider.categories.length,
                      itemBuilder: (ctx, i) {
                        final category = categoryProvider.categories[i];
                        return Card(
                          margin: const EdgeInsets.symmetric(
                              horizontal: 15, vertical: 5),
                          child: ListTile(
                            leading: category.imageUrl != null &&
                                    category.imageUrl!.isNotEmpty
                                ? CircleAvatar(
                                    backgroundImage:
                                        NetworkImage(category.imageUrl!),
                                    onBackgroundImageError:
                                        (exception, stackTrace) {
                                      // Log error or show placeholder
                                    },
                                  )
                                : const CircleAvatar(
                                    child: Icon(Icons.category)),
                            title: Text(category.name),
                            subtitle: category.description != null &&
                                    category.description!.isNotEmpty
                                ? Text(category.description!)
                                : null,
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.edit,
                                      color: Colors.orange),
                                  tooltip: 'Düzenle',
                                  onPressed: () => _showAddCategoryDialog(
                                      context,
                                      categoryToEdit: category),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete,
                                      color: Colors.red),
                                  tooltip: 'Sil',
                                  onPressed: () async {
                                    final confirm = await showDialog<bool>(
                                      context: context,
                                      builder: (ctx) => AlertDialog(
                                        title: const Text('Kategoriyi Sil'),
                                        content: Text(
                                            '\'${category.name}\' kategorisini silmek istediğinizden emin misiniz?'),
                                        actions: [
                                          TextButton(
                                            onPressed: () =>
                                                Navigator.of(ctx).pop(false),
                                            child: const Text('İptal'),
                                          ),
                                          TextButton(
                                            onPressed: () =>
                                                Navigator.of(ctx).pop(true),
                                            child: const Text('Sil',
                                                style: TextStyle(
                                                    color: Colors.red)),
                                          ),
                                        ],
                                      ),
                                    );
                                    if (confirm == true) {
                                      final success = await categoryProvider
                                          .deleteCategory(category.id);
                                      if (success) {
                                        ScaffoldMessenger.of(context)
                                            .showSnackBar(
                                          const SnackBar(
                                              content:
                                                  Text('Kategori silindi!')),
                                        );
                                      } else {
                                        ScaffoldMessenger.of(context)
                                            .showSnackBar(
                                          SnackBar(
                                              content: Text(
                                                  categoryProvider.error ??
                                                      'Kategori silinemedi.'),
                                              backgroundColor: Colors.red),
                                        );
                                      }
                                    }
                                  },
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}
