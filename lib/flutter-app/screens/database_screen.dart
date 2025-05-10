import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:convert';
import '../widgets/app_drawer.dart';
import '../providers/database_provider.dart';
import '../utils/responsive.dart';

class DatabaseScreen extends StatefulWidget {
  const DatabaseScreen({Key? key}) : super(key: key);

  @override
  State<DatabaseScreen> createState() => _DatabaseScreenState();
}

class _DatabaseScreenState extends State<DatabaseScreen> {
  final TextEditingController _queryController = TextEditingController();
  Map<String, dynamic>? _queryResult;
  bool _showHistory = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<DatabaseProvider>(context, listen: false)
          .checkDatabaseHealth();
    });
  }

  @override
  void dispose() {
    _queryController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Database Management'),
      ),
      drawer: const AppDrawer(),
      body: Consumer<DatabaseProvider>(
        builder: (context, databaseProvider, _) {
          final isLoading = databaseProvider.isLoading;
          final error = databaseProvider.error;
          final healthStats = databaseProvider.healthStats;
          final queryHistory = databaseProvider.queryHistory;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Database Management',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),

                const SizedBox(height: 24),

                if (error != null)
                  Container(
                    padding: const EdgeInsets.all(16),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: Colors.red[100],
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.red),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Error',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.red[900],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(error),
                        const SizedBox(height: 8),
                        ElevatedButton(
                          onPressed: () => databaseProvider.clearError(),
                          child: const Text('Dismiss'),
                        ),
                      ],
                    ),
                  ),

                // Health Stats Card
                Card(
                  elevation: 4,
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Database Health',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            IconButton(
                              icon: const Icon(Icons.refresh),
                              onPressed: isLoading
                                  ? null
                                  : () =>
                                      databaseProvider.checkDatabaseHealth(),
                            ),
                          ],
                        ),
                        const Divider(),
                        if (isLoading && healthStats.isEmpty)
                          const Center(child: CircularProgressIndicator())
                        else
                          healthStats.isEmpty
                              ? const Center(
                                  child: Text('No health data available'),
                                )
                              : Column(
                                  children: [
                                    _buildHealthItem(
                                      'Status',
                                      healthStats['status'] ?? 'Unknown',
                                      healthStats['status'] == 'healthy'
                                          ? Colors.green
                                          : Colors.red,
                                    ),
                                    _buildHealthItem(
                                      'Tables Count',
                                      '${healthStats['tablesCount'] ?? 'Unknown'}',
                                      Colors.blue,
                                    ),
                                    _buildHealthItem(
                                      'Total Rows',
                                      '${healthStats['totalRows'] ?? 'Unknown'}',
                                      Colors.orange,
                                    ),
                                    _buildHealthItem(
                                      'Last Backup',
                                      healthStats['lastBackup'] ?? 'Never',
                                      Colors.purple,
                                    ),
                                  ],
                                ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                // Database Actions Card
                Card(
                  elevation: 4,
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Database Actions',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const Divider(),
                        Wrap(
                          spacing: 16,
                          runSpacing: 16,
                          children: [
                            ElevatedButton.icon(
                              onPressed: isLoading
                                  ? null
                                  : () => _handleInitializeDatabase(context),
                              icon: const Icon(Icons.power_settings_new),
                              label: const Text('Initialize Database'),
                            ),
                            ElevatedButton.icon(
                              onPressed: isLoading
                                  ? null
                                  : () => _handleUpdateSchema(context),
                              icon: const Icon(Icons.update),
                              label: const Text('Update Schema'),
                            ),
                            ElevatedButton.icon(
                              onPressed: isLoading
                                  ? null
                                  : () => _handleUpdateFunctions(context),
                              icon: const Icon(Icons.functions),
                              label: const Text('Update Functions'),
                            ),
                            ElevatedButton.icon(
                              onPressed: isLoading
                                  ? null
                                  : () => _handleBackupDatabase(context),
                              icon: const Icon(Icons.backup),
                              label: const Text('Backup Database'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                // SQL Query Card
                Card(
                  elevation: 4,
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Execute SQL Query',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            Row(
                              children: [
                                // Toggle history button
                                IconButton(
                                  icon: Icon(
                                    _showHistory
                                        ? Icons.history
                                        : Icons.history_outlined,
                                    color: _showHistory ? Colors.blue : null,
                                  ),
                                  onPressed: () {
                                    setState(() {
                                      _showHistory = !_showHistory;
                                    });
                                  },
                                  tooltip: 'Query History',
                                ),

                                // Clear history button
                                if (_showHistory && queryHistory.isNotEmpty)
                                  IconButton(
                                    icon: const Icon(Icons.delete_outline),
                                    onPressed: () =>
                                        _showClearHistoryDialog(context),
                                    tooltip: 'Clear History',
                                  ),
                              ],
                            ),
                          ],
                        ),
                        const Divider(),

                        // Query History
                        if (_showHistory)
                          queryHistory.isEmpty
                              ? const Padding(
                                  padding: EdgeInsets.symmetric(vertical: 16.0),
                                  child: Center(
                                    child: Text('No query history yet'),
                                  ),
                                )
                              : Container(
                                  height: 200,
                                  decoration: BoxDecoration(
                                    border:
                                        Border.all(color: Colors.grey.shade300),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: ListView.builder(
                                    itemCount: queryHistory.length,
                                    itemBuilder: (context, index) {
                                      return ListTile(
                                        title: Text(
                                          queryHistory[index],
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        trailing: IconButton(
                                          icon: const Icon(Icons.copy),
                                          onPressed: () {
                                            _queryController.text =
                                                queryHistory[index];
                                          },
                                          tooltip: 'Use this query',
                                        ),
                                        onTap: () {
                                          _queryController.text =
                                              queryHistory[index];
                                          setState(() {
                                            _showHistory = false;
                                          });
                                        },
                                      );
                                    },
                                  ),
                                ),

                        if (_showHistory) const SizedBox(height: 16),

                        TextField(
                          controller: _queryController,
                          maxLines: 4,
                          decoration: const InputDecoration(
                            hintText: 'Enter your SQL query here...',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            ElevatedButton.icon(
                              onPressed: isLoading
                                  ? null
                                  : () => _executeQuery(context),
                              icon: const Icon(Icons.play_arrow),
                              label: const Text('Execute Query'),
                            ),
                          ],
                        ),
                        if (_queryResult != null) ...[
                          const SizedBox(height: 16),
                          const Divider(),
                          Text(
                            'Query Result',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.grey[200],
                              borderRadius: BorderRadius.circular(4),
                            ),
                            width: double.infinity,
                            child: _buildQueryResultWidget(),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // Show dialog to confirm clearing history
  void _showClearHistoryDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear Query History'),
        content: const Text(
            'Are you sure you want to clear your query history? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
            },
            child: const Text('CANCEL'),
          ),
          TextButton(
            onPressed: () {
              Provider.of<DatabaseProvider>(context, listen: false)
                  .clearQueryHistory();
              Navigator.of(context).pop();
            },
            child: const Text('CLEAR'),
          ),
        ],
      ),
    );
  }

  Widget _buildHealthItem(String label, String value, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.w500,
              fontSize: 16,
            ),
          ),
          Chip(
            label: Text(
              value,
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
            backgroundColor: color,
          ),
        ],
      ),
    );
  }

  Widget _buildQueryResultWidget() {
    if (_queryResult == null) {
      return const Text('No result');
    }

    if (_queryResult!.containsKey('error')) {
      return Text(
        'Error: ${_queryResult!['error']}',
        style: const TextStyle(color: Colors.red),
      );
    }

    if (_queryResult!.containsKey('message')) {
      return Text(_queryResult!['message']);
    }

    if (_queryResult!.containsKey('data') && _queryResult!['data'] is List) {
      final data = _queryResult!['data'] as List;
      if (data.isEmpty) {
        return const Text('No rows returned');
      }

      // Get column names from the first row
      final columns = (data.first as Map<String, dynamic>).keys.toList();

      return SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          columns:
              columns.map((column) => DataColumn(label: Text(column))).toList(),
          rows: data
              .map(
                (row) => DataRow(
                  cells: columns
                      .map(
                        (column) => DataCell(
                          Text(
                            '${(row as Map<String, dynamic>)[column]}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      )
                      .toList(),
                ),
              )
              .toList(),
        ),
      );
    }

    return Text(jsonEncode(_queryResult));
  }

  Future<void> _handleInitializeDatabase(BuildContext context) async {
    final provider = Provider.of<DatabaseProvider>(context, listen: false);
    final success = await provider.initializeDatabase();

    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          success
              ? 'Database initialized successfully'
              : 'Failed to initialize database',
        ),
        backgroundColor: success ? Colors.green : Colors.red,
      ),
    );
  }

  Future<void> _handleUpdateSchema(BuildContext context) async {
    final provider = Provider.of<DatabaseProvider>(context, listen: false);
    final success = await provider.updateDatabaseSchema();

    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          success ? 'Schema updated successfully' : 'Failed to update schema',
        ),
        backgroundColor: success ? Colors.green : Colors.red,
      ),
    );
  }

  Future<void> _handleUpdateFunctions(BuildContext context) async {
    final provider = Provider.of<DatabaseProvider>(context, listen: false);
    final success = await provider.updateDatabaseFunctions();

    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          success
              ? 'Functions updated successfully'
              : 'Failed to update functions',
        ),
        backgroundColor: success ? Colors.green : Colors.red,
      ),
    );
  }

  Future<void> _handleBackupDatabase(BuildContext context) async {
    final provider = Provider.of<DatabaseProvider>(context, listen: false);
    final backupUrl = await provider.backupDatabase();

    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          backupUrl != null
              ? 'Database backed up successfully'
              : 'Failed to backup database',
        ),
        backgroundColor: backupUrl != null ? Colors.green : Colors.red,
      ),
    );
  }

  Future<void> _executeQuery(BuildContext context) async {
    final query = _queryController.text.trim();
    if (query.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a SQL query'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final provider = Provider.of<DatabaseProvider>(context, listen: false);
    final result = await provider.executeQuery(query);

    setState(() {
      _queryResult = result;
    });
  }
}
