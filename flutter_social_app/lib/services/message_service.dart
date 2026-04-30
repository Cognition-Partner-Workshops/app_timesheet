import '../models/message.dart';
import 'database_service.dart';

class MessageService {
  Future<void> sendMessage({
    required int senderId,
    required int receiverId,
    required String content,
  }) async {
    final db = await DatabaseService.database;
    final message = ChatMessage(
      senderId: senderId,
      receiverId: receiverId,
      content: content,
    );
    await db.insert('messages', message.toMap());
  }

  Future<List<ChatMessage>> getMessages(int userId, int friendId) async {
    final db = await DatabaseService.database;
    final results = await db.rawQuery('''
      SELECT m.*, u.display_name as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?)
         OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at ASC
    ''', [userId, friendId, friendId, userId]);

    await db.update(
      'messages',
      {'is_read': 1},
      where: 'sender_id = ? AND receiver_id = ? AND is_read = 0',
      whereArgs: [friendId, userId],
    );

    return results.map((map) => ChatMessage.fromMap(map)).toList();
  }

  Future<int> getUnreadCount(int userId) async {
    final db = await DatabaseService.database;
    final result = await db.rawQuery('''
      SELECT COUNT(*) as count FROM messages
      WHERE receiver_id = ? AND is_read = 0
    ''', [userId]);
    return result.first['count'] as int;
  }

  Future<int> getUnreadCountFrom(int userId, int senderId) async {
    final db = await DatabaseService.database;
    final result = await db.rawQuery('''
      SELECT COUNT(*) as count FROM messages
      WHERE receiver_id = ? AND sender_id = ? AND is_read = 0
    ''', [userId, senderId]);
    return result.first['count'] as int;
  }
}
