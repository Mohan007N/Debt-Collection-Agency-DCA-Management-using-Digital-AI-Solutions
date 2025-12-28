from datetime import datetime
from database import db
from flask_login import UserMixin

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    username = db.Column(db.String(80), nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default='user')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
class CustomerAccount(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    account_number = db.Column(db.String(50), unique=True, nullable=False)
    customer_name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(120))
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    credit_limit = db.Column(db.Float, default=0)
    current_balance = db.Column(db.Float, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class DCAAgency(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False)
    contact_person = db.Column(db.String(100))
    email = db.Column(db.String(120))
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    recovery_rate = db.Column(db.Float, default=0)
    sla_compliance = db.Column(db.Float, default=0)
    status = db.Column(db.String(20), default='active')
    contract_start = db.Column(db.Date)
    contract_end = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class RecoveryCase(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey('customer_account.id'))
    agency_id = db.Column(db.Integer, db.ForeignKey('dca_agency.id'))
    case_number = db.Column(db.String(50), unique=True, nullable=False)
    amount_due = db.Column(db.Float, nullable=False)
    recovered_amount = db.Column(db.Float, default=0)
    days_overdue = db.Column(db.Integer, nullable=False)
    priority = db.Column(db.String(20), default='medium')
    status = db.Column(db.String(30), default='pending')
    allocation_method = db.Column(db.String(30))  # auto, manual, priority-based
    allocated_at = db.Column(db.DateTime)
    sla_deadline = db.Column(db.DateTime)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)
    
    customer_account = db.relationship('CustomerAccount', backref='cases')
    agency = db.relationship('DCAAgency', backref='cases')

class DCAAllocation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.Integer, db.ForeignKey('recovery_case.id'))
    agency_id = db.Column(db.Integer, db.ForeignKey('dca_agency.id'))
    allocated_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    allocated_at = db.Column(db.DateTime, default=datetime.utcnow)
    allocation_reason = db.Column(db.Text)
    
    case = db.relationship('RecoveryCase', backref='allocations')
    agency = db.relationship('DCAAgency')
    allocator = db.relationship('User')

class AuditLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    action = db.Column(db.String(100), nullable=False)
    entity_type = db.Column(db.String(50))
    entity_id = db.Column(db.Integer)
    details = db.Column(db.Text)
    ip_address = db.Column(db.String(45))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='audit_logs')