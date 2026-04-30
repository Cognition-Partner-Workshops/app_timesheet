import '../models/friend_request.dart';
import '../models/user.dart';
import 'database_service.dart';

class FriendService {
  Future<List<User>> searchUsers(String query, int currentUserId) async {
    final db = await DatabaseService.database;
    final results = await db.query(
      'users',
      where: '(username LIKE ? OR display_name LIKE ?) AND id != ?',
      whereArgs: ['%$query%', '%$query%', currentUserId],
    );
    return results.map((map) => User.fromMap(map)).toList();
  }

  Future<String?> sendFriendRequest(int senderId, int receiverId) async {
    final db = await DatabaseService.database;

    final existing = await db.query(
      'friend_requests',
      where: '(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)',
      whereArgs: [senderId, receiverId, receiverId, senderId],
    );

    if (existing.isNotEmpty) {
      final status = existing.first['status'] as String;
      if (status == 'accepted') return 'Already friends';
      if (status == 'pending') return 'Request already pending';
    }

    final request = FriendRequest(
      senderId: senderId,
      receiverId: receiverId,
    );

    await db.insert('friend_requests', request.toMap());
    return null;
  }

  Future<List<FriendRequest>> getPendingRequests(int userId) async {
    final db = await DatabaseService.database;
    final results = await db.rawQuery('''
      SELECT fr.*, 
             sender.display_name as sender_name,
             sender.username as sender_username,
             receiver.display_name as receiver_name,
             receiver.username as receiver_username
      FROM friend_requests fr
      JOIN users sender ON fr.sender_id = sender.id
      JOIN users receiver ON fr.receiver_id = receiver.id
      WHERE fr.receiver_id = ? AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    ''', [userId]);
    return results.map((map) => FriendRequest.fromMap(map)).toList();
  }

  Future<List<FriendRequest>> getSentRequests(int userId) async {
    final db = await DatabaseService.database;
    final results = await db.rawQuery('''
      SELECT fr.*, 
             sender.display_name as sender_name,
             sender.username as sender_username,
             receiver.display_name as receiver_name,
             receiver.username as receiver_username
      FROM friend_requests fr
      JOIN users sender ON fr.sender_id = sender.id
      JOIN users receiver ON fr.receiver_id = receiver.id
      WHERE fr.sender_id = ? AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    ''', [userId]);
    return results.map((map) => FriendRequest.fromMap(map)).toList();
  }

  Future<void> acceptFriendRequest(int requestId) async {
    final db = await DatabaseService.database;
    await db.update(
      'friend_requests',
      {'status': 'accepted'},
      where: 'id = ?',
      whereArgs: [requestId],
    );
  }

  Future<void> rejectFriendRequest(int requestId) async {
    final db = await DatabaseService.database;
    await db.update(
      'friend_requests',
      {'status': 'rejected'},
      where: 'id = ?',
      whereArgs: [requestId],
    );
  }

  Future<List<User>> getFriends(int userId) async {
    final db = await DatabaseService.database;
    final results = await db.rawQuery('''
      SELECT u.* FROM users u
      INNER JOIN friend_requests fr ON 
        (fr.sender_id = u.id AND fr.receiver_id = ?)
        OR (fr.receiver_id = u.id AND fr.sender_id = ?)
      WHERE fr.status = 'accepted'
      ORDER BY u.display_name
    ''', [userId, userId]);
    return results.map((map) => User.fromMap(map)).toList();
  }

  Future<String?> getFriendshipStatus(int userId, int otherUserId) async {
    final db = await DatabaseService.database;
    final results = await db.query(
      'friend_requests',
      where: '(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)',
      whereArgs: [userId, otherUserId, otherUserId, userId],
    );

    if (results.isEmpty) return null;

    final request = results.first;
    final status = request['status'] as String;
    if (status == 'accepted') return 'friends';
    if (status == 'pending') {
      if (request['sender_id'] == userId) return 'request_sent';
      return 'request_received';
    }
    return null;
  }
}
