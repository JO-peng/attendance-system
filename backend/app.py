#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
考勤签到系统后端API
使用Flask框架构建RESTful API
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
import os
import uuid
import json
import logging
from functools import wraps
from wechat_api import get_wechat_api

# 创建Flask应用
app = Flask(__name__)

# 配置
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///attendance.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# 初始化扩展
db = SQLAlchemy(app)
# 配置CORS以支持ngrok等穿透工具
CORS(app, origins=['*'], allow_headers=['*'], methods=['*'])

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 确保上传目录存在
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'photos'), exist_ok=True)
os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'feedback'), exist_ok=True)

# 允许的文件扩展名
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    """检查文件扩展名是否允许"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# 企业微信域名验证文件路由
@app.route('/WW_verify_<verification_code>.txt')
def wechat_domain_verification(verification_code):
    """企业微信域名验证文件"""
    try:
        # 直接返回验证码内容
        return verification_code, 200, {'Content-Type': 'text/plain'}
    except Exception as e:
        logger.error(f"域名验证失败: {e}")
        return "Verification failed", 404

# 数据库模型
class User(db.Model):
    """用户模型"""
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(50), nullable=False)
    wechat_userid = db.Column(db.String(100), unique=True, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 关联签到记录
    attendances = db.relationship('Attendance', backref='user', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'name': self.name,
            'wechat_userid': self.wechat_userid,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Attendance(db.Model):
    """签到记录模型"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    course_name = db.Column(db.String(100), nullable=False)
    classroom = db.Column(db.String(100), nullable=False)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    location_address = db.Column(db.String(200), nullable=True)
    photo_path = db.Column(db.String(200), nullable=True)
    status = db.Column(db.String(20), default='attended')  # attended, late, absent
    signed_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.name if self.user else None,
            'student_id': self.user.student_id if self.user else None,
            'course_name': self.course_name,
            'classroom': self.classroom,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'location_address': self.location_address,
            'photo_path': self.photo_path,
            'status': self.status,
            'signed_at': self.signed_at.isoformat() if self.signed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Feedback(db.Model):
    """反馈模型"""
    id = db.Column(db.Integer, primary_key=True)
    rating = db.Column(db.Integer, nullable=False)
    feedback_type = db.Column(db.String(20), nullable=False)  # bug, suggestion, praise, other
    content = db.Column(db.Text, nullable=False)
    contact_info = db.Column(db.String(100), nullable=True)
    images = db.Column(db.Text, nullable=True)  # JSON格式存储图片路径
    user_agent = db.Column(db.String(500), nullable=True)
    ip_address = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'rating': self.rating,
            'feedback_type': self.feedback_type,
            'content': self.content,
            'contact_info': self.contact_info,
            'images': json.loads(self.images) if self.images else [],
            'user_agent': self.user_agent,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

# 错误处理装饰器
def handle_errors(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"API错误: {str(e)}")
            return jsonify({
                'success': False,
                'message': '服务器内部错误',
                'error': str(e)
            }), 500
    return decorated_function

@app.after_request
def after_request(response):
    """添加CORS头部以支持ngrok等穿透工具"""
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', '*')
    response.headers.add('Access-Control-Allow-Methods', '*')
    return response

# API路由
@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        'success': True,
        'message': '服务运行正常',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/api/wechat/config', methods=['POST'])
@handle_errors
def get_wechat_config():
    """获取企业微信JS-SDK配置"""
    data = request.get_json()
    url = data.get('url')
    
    if not url:
        return jsonify({
            'success': False,
            'message': '缺少URL参数'
        }), 400
    
    try:
        wechat_api = get_wechat_api()
        config = wechat_api.generate_js_config(url)
        return jsonify({
            'success': True,
            'data': config
        })
    except Exception as e:
        logger.error(f"Failed to generate WeChat config: {e}")
        return jsonify({
            'success': False,
            'message': f'获取配置失败: {str(e)}'
        }), 500

@app.route('/api/wechat/userinfo', methods=['POST'])
@handle_errors
def get_wechat_userinfo():
    """通过企业微信授权码获取用户信息"""
    data = request.get_json()
    code = data.get('code')
    
    if not code:
        return jsonify({
            'success': False,
            'message': '缺少授权码'
        }), 400
    
    try:
        wechat_api = get_wechat_api()
        user_info = wechat_api.get_user_info_by_code(code)
        
        # 转换为系统需要的格式
        formatted_user_info = {
            'student_id': user_info.get('userid', ''),
            'name': user_info.get('name', ''),
            'wechat_userid': user_info.get('userid', ''),
            'department': ', '.join([str(dept) for dept in user_info.get('department', [])]),
            'position': user_info.get('position', ''),
            'mobile': user_info.get('mobile', ''),
            'email': user_info.get('email', ''),
            'avatar': user_info.get('avatar', '')
        }
        
        return jsonify({
            'success': True,
            'data': formatted_user_info
        })
    except Exception as e:
        logger.error(f"Failed to get WeChat user info: {e}")
        return jsonify({
            'success': False,
            'message': f'获取用户信息失败: {str(e)}'
        }), 500

@app.route('/api/user/info', methods=['GET'])
@handle_errors
def get_user_info():
    """获取用户信息（兼容接口，优先使用企业微信）"""
    # 尝试从请求头获取用户ID
    userid = request.headers.get('X-WeChat-UserID')
    
    if userid:
        try:
            wechat_api = get_wechat_api()
            user_info = wechat_api.get_user_detail(userid)
            formatted_user_info = {
                'student_id': user_info.get('userid', ''),
                'name': user_info.get('name', ''),
                'wechat_userid': user_info.get('userid', ''),
                'department': ', '.join([str(dept) for dept in user_info.get('department', [])]),
                'avatar': user_info.get('avatar', '')
            }
            return jsonify({
                'success': True,
                'data': formatted_user_info
            })
        except Exception as e:
            logger.warning(f"Failed to get WeChat user info, using mock data: {e}")
    
    # 模拟用户信息（开发测试用）
    user_info = {
        'student_id': '2020000319',
        'name': '胡凯峰',
        'wechat_userid': 'mock_wechat_user_id',
        'department': '计算机学院',
        'avatar': 'https://picsum.photos/100/100?random=1'
    }
    
    return jsonify({
        'success': True,
        'data': user_info
    })

@app.route('/api/attendance/sign', methods=['POST'])
@app.route('/signin', methods=['POST'])  # 添加前端使用的路由
@handle_errors
def sign_attendance():
    """签到接口"""
    data = request.get_json()
    logger.info(f"Received signin data: {data}")
    
    # 验证必需字段
    required_fields = ['student_id', 'name', 'course_name', 'classroom']
    for field in required_fields:
        if not data.get(field):
            return jsonify({
                'success': False,
                'message': f'缺少必需字段: {field}'
            }), 400
    
    # 检查或创建用户
    user = User.query.filter_by(student_id=data['student_id']).first()
    if not user:
        user = User(
            student_id=data['student_id'],
            name=data['name'],
            wechat_userid=data.get('wechat_userid')
        )
        db.session.add(user)
        db.session.commit()
    
    # 检查今天是否已经签到过相同课程
    today = datetime.utcnow().date()
    existing_attendance = Attendance.query.filter(
        Attendance.user_id == user.id,
        Attendance.course_name == data['course_name'],
        db.func.date(Attendance.signed_at) == today
    ).first()
    
    if existing_attendance:
        return jsonify({
            'success': False,
            'message': '今天已经签到过该课程了'
        }), 400
    # # 判断签到状态（基于时间）
    # current_time = datetime.utcnow().time()
    # # 假设上课时间是8:00-18:00，迟到时间是课程开始后15分钟
    # status = 'attended'
    # if current_time.hour < 8 or current_time.hour >= 18:
    #     status = 'late'  # 非正常上课时间视为迟到

    status = 'attended'  # 全天都视为正常签到        先暂时这样
    # 后续再根据实际情况调整
    
    # 处理照片数据
    photo_path = None
    if data.get('photo'):
        try:
            photo_data = data['photo']
            if photo_data.startswith('data:image/'):
                # 处理base64格式的照片
                import base64
                import mimetypes
                
                # 解析base64数据
                header, encoded = photo_data.split(',', 1)
                mime_type = header.split(';')[0].split(':')[1]
                
                # 获取文件扩展名
                extension = mimetypes.guess_extension(mime_type) or '.jpg'
                
                # 生成唯一文件名
                unique_filename = f"{uuid.uuid4().hex}{extension}"
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], 'photos', unique_filename)
                
                # 确保目录存在
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                
                # 保存文件
                with open(file_path, 'wb') as f:
                    f.write(base64.b64decode(encoded))
                
                photo_path = f"photos/{unique_filename}"
            else:
                # 企业微信照片ID或其他格式，暂时保存为文本
                photo_path = photo_data
        except Exception as e:
            print(f"Failed to process photo: {e}")
            # 照片处理失败不影响签到
    
    # 创建签到记录
    attendance = Attendance(
        user_id=user.id,
        course_name=data['course_name'],
        classroom=data['classroom'],
        latitude=data.get('latitude'),
        longitude=data.get('longitude'),
        location_address=data.get('location_address'),
        photo_path=photo_path,
        status=status
    )
    
    db.session.add(attendance)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '签到成功',
        'data': attendance.to_dict()
    })

@app.route('/api/attendance/upload-photo', methods=['POST'])
@handle_errors
def upload_photo():
    """上传签到照片"""
    if 'photo' not in request.files:
        return jsonify({
            'success': False,
            'message': '没有上传文件'
        }), 400
    
    file = request.files['photo']
    attendance_id = request.form.get('attendance_id')
    
    if file.filename == '':
        return jsonify({
            'success': False,
            'message': '没有选择文件'
        }), 400
    
    if not attendance_id:
        return jsonify({
            'success': False,
            'message': '缺少签到记录ID'
        }), 400
    
    if file and allowed_file(file.filename):
        # 生成安全的文件名
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], 'photos', unique_filename)
        
        # 保存文件
        file.save(file_path)
        
        # 更新签到记录
        attendance = Attendance.query.get(attendance_id)
        if attendance:
            attendance.photo_path = f"photos/{unique_filename}"
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': '照片上传成功',
                'data': {
                    'photo_path': attendance.photo_path,
                    'photo_url': f"/api/uploads/{attendance.photo_path}"
                }
            })
        else:
            # 删除已上传的文件
            os.remove(file_path)
            return jsonify({
                'success': False,
                'message': '签到记录不存在'
            }), 404
    
    return jsonify({
        'success': False,
        'message': '不支持的文件格式'
    }), 400

@app.route('/api/attendance/records', methods=['GET'])
@handle_errors
def get_attendance_records():
    """获取签到记录"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    student_id = request.args.get('student_id')
    status = request.args.get('status')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # 构建查询
    query = Attendance.query.join(User)
    
    if student_id:
        query = query.filter(User.student_id == student_id)
    
    if status and status != 'all':
        query = query.filter(Attendance.status == status)
    
    if start_date:
        try:
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(Attendance.signed_at >= start_date)
        except ValueError:
            pass
    
    if end_date:
        try:
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(Attendance.signed_at <= end_date)
        except ValueError:
            pass
    
    # 按时间倒序排列
    query = query.order_by(Attendance.signed_at.desc())
    
    # 分页
    pagination = query.paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    records = [record.to_dict() for record in pagination.items]
    
    return jsonify({
        'success': True,
        'data': {
            'records': records,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_prev': pagination.has_prev,
                'has_next': pagination.has_next
            }
        }
    })

@app.route('/api/attendance/statistics', methods=['GET'])
@handle_errors
def get_attendance_statistics():
    """获取签到统计"""
    student_id = request.args.get('student_id')
    year = request.args.get('year', datetime.utcnow().year, type=int)
    month = request.args.get('month', datetime.utcnow().month, type=int)
    
    # 构建查询
    query = Attendance.query.join(User)
    
    if student_id:
        query = query.filter(User.student_id == student_id)
    
    # 按年月筛选
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)
    
    query = query.filter(
        Attendance.signed_at >= start_date,
        Attendance.signed_at < end_date
    )
    
    # 统计各种状态的数量
    total_count = query.count()
    attended_count = query.filter(Attendance.status == 'attended').count()
    late_count = query.filter(Attendance.status == 'late').count()
    absent_count = query.filter(Attendance.status == 'absent').count()
    
    # 计算出勤率
    attendance_rate = (attended_count / total_count * 100) if total_count > 0 else 0
    
    # 获取每日签到情况
    daily_records = {}
    records = query.all()
    for record in records:
        day = record.signed_at.day
        if day not in daily_records:
            daily_records[day] = []
        daily_records[day].append(record.to_dict())
    
    return jsonify({
        'success': True,
        'data': {
            'year': year,
            'month': month,
            'total_count': total_count,
            'attended_count': attended_count,
            'late_count': late_count,
            'absent_count': absent_count,
            'attendance_rate': round(attendance_rate, 1),
            'daily_records': daily_records
        }
    })

@app.route('/api/feedback/submit', methods=['POST'])
@handle_errors
def submit_feedback():
    """提交反馈"""
    data = request.get_json()
    
    # 验证必需字段
    required_fields = ['rating', 'feedback_type', 'content']
    for field in required_fields:
        if field not in data:
            return jsonify({
                'success': False,
                'message': f'缺少必需字段: {field}'
            }), 400
    
    # 验证评分范围
    if not (1 <= data['rating'] <= 5):
        return jsonify({
            'success': False,
            'message': '评分必须在1-5之间'
        }), 400
    
    # 创建反馈记录
    feedback = Feedback(
        rating=data['rating'],
        feedback_type=data['feedback_type'],
        content=data['content'],
        contact_info=data.get('contact_info'),
        images=json.dumps(data.get('images', [])),
        user_agent=request.headers.get('User-Agent'),
        ip_address=request.remote_addr,
        user_id=data.get('user_id')  # 保存用户ID
    )
    
    db.session.add(feedback)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '反馈提交成功',
        'data': feedback.to_dict()
    })

@app.route('/api/uploads/<path:filename>', methods=['GET'])
def uploaded_file(filename):
    """获取上传的文件"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# 静态文件服务（开发环境）
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_static(path):
    """服务静态文件"""
    if path != "" and os.path.exists(os.path.join('..', 'frontend', path)):
        return send_from_directory(os.path.join('..', 'frontend'), path)
    else:
        return send_from_directory(os.path.join('..', 'frontend'), 'index.html')

# 初始化数据库
def create_tables():
    """创建数据库表"""
    with app.app_context():
        db.create_all()
        logger.info("数据库表创建完成")

if __name__ == '__main__':
    # 开发环境运行
    app.run(debug=True, host='0.0.0.0', port=5000)