import pandas as pd
from io import BytesIO
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import json
import os
from database import db
from models import User, DCAAgency, DCAAllocation, CustomerAccount, RecoveryCase


app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here-change-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///dca_management.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Routes
@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        user = User.query.filter_by(email=email).first()
        
        if user and check_password_hash(user.password, password):
            login_user(user, remember=True)
            return redirect(url_for('dashboard'))
        
        return render_template('login.html', error='Invalid credentials')
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        email = request.form.get('email')
        username = request.form.get('username')
        password = request.form.get('password')
        role = request.form.get('role', 'user')
        
        user_exists = User.query.filter_by(email=email).first()
        if user_exists:
            return render_template('register.html', error='User already exists')
        
        new_user = User(
            email=email,
            username=username,
            password=generate_password_hash(password),
            role=role
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        login_user(new_user)
        return redirect(url_for('dashboard'))
    
    return render_template('register.html')

@app.route('/dashboard')
@login_required
def dashboard():
    # Get dashboard statistics
    total_cases = RecoveryCase.query.count()
    active_cases = RecoveryCase.query.filter_by(status='active').count()
    recovered_amount = db.session.query(db.func.sum(RecoveryCase.recovered_amount)).scalar() or 0
    pending_amount = db.session.query(db.func.sum(RecoveryCase.amount_due)).scalar() or 0
    
    # Get recent activities
    recent_cases = RecoveryCase.query.order_by(RecoveryCase.created_at.desc()).limit(10).all()
    
    # Get agency performance
    agencies = DCAAgency.query.all()
    
    return render_template('dashboard.html',
                         total_cases=total_cases,
                         active_cases=active_cases,
                         recovered_amount=recovered_amount,
                         pending_amount=pending_amount,
                         recent_cases=recent_cases,
                         agencies=agencies)


@app.route('/cases')
@login_required
def cases_page():
    # The frontend can call `/api/cases` for paginated data; render template here
    return render_template('cases.html')


@app.route('/agencies')
@login_required
def agencies_page():
    agencies = DCAAgency.query.all()
    return render_template('agencies.html', agencies=agencies)


@app.route('/profile')
@login_required
def profile_page():
    return render_template('profile.html', user=current_user)


@app.route('/settings')
@login_required
def settings_page():
    return render_template('settings.html', user=current_user)

@app.route('/api/cases')
@login_required
def get_cases():
    status_filter = request.args.get('status', 'all')
    page = int(request.args.get('page', 1))
    per_page = 20
    
    query = RecoveryCase.query
    
    if status_filter != 'all':
        query = query.filter_by(status=status_filter)
    
    cases = query.order_by(RecoveryCase.created_at.desc())\
                .paginate(page=page, per_page=per_page)
    
    cases_data = [{
        'id': case.id,
        'account_number': case.customer_account.account_number,
        'customer_name': case.customer_account.customer_name,
        'amount_due': case.amount_due,
        'days_overdue': case.days_overdue,
        'agency_name': case.agency.name if case.agency else 'Unassigned',
        'status': case.status,
        'created_at': case.created_at.strftime('%Y-%m-%d')
    } for case in cases.items]
    
    return jsonify({
        'cases': cases_data,
        'total': cases.total,
        'pages': cases.pages,
        'current_page': page
    })

@app.route('/api/allocate-case', methods=['POST'])
@login_required
def allocate_case():
    data = request.json
    case_id = data.get('case_id')
    agency_id = data.get('agency_id')
    
    case = RecoveryCase.query.get(case_id)
    agency = DCAAgency.query.get(agency_id)
    
    if case and agency:
        case.agency_id = agency_id
        case.status = 'allocated'
        case.allocated_at = datetime.utcnow()
        
        # Create allocation record
        allocation = DCAAllocation(
            case_id=case_id,
            agency_id=agency_id,
            allocated_by=current_user.id,
            allocated_at=datetime.utcnow()
        )
        
        db.session.add(allocation)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Case allocated successfully'})
    
    return jsonify({'success': False, 'message': 'Error allocating case'})

@app.route('/api/performance-metrics')
@login_required
def performance_metrics():
    # Calculate various performance metrics
    metrics = {
        'recovery_rate': calculate_recovery_rate(),
        'average_recovery_time': calculate_avg_recovery_time(),
        'sla_compliance': calculate_sla_compliance(),
        'top_performing_agencies': get_top_performing_agencies()
    }
    return jsonify(metrics)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

def calculate_recovery_rate():
    # Implementation for recovery rate calculation
    total_recovered = db.session.query(db.func.sum(RecoveryCase.recovered_amount)).scalar() or 0
    total_due = db.session.query(db.func.sum(RecoveryCase.amount_due)).scalar() or 0
    return (total_recovered / total_due * 100) if total_due > 0 else 0

def calculate_avg_recovery_time():
    # Implementation for average recovery time
    return 45  # Example value

def calculate_sla_compliance():
    # Implementation for SLA compliance calculation
    return 92  # Example value

def get_top_performing_agencies():
    # Implementation for top agencies
    return []

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000)