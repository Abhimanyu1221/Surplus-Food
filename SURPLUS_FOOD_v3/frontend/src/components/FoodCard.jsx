import React from 'react';

const FoodCard = ({ food, onAction, actionLabel }) => {
    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
            <div>
                <h3>{food.title}</h3>
                <p style={{ color: 'var(--text-light)', marginBottom: '1rem' }}>{food.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span className="status-badge" style={{ background: '#e2e8f0' }}>Qty: {food.quantity}</span>
                    <span className="status-badge" style={{
                        background: food.status === 'available' ? '#dcfce7' : '#fef9c3',
                        color: food.status === 'available' ? '#166534' : '#854d0e'
                    }}>
                        {food.status.charAt(0).toUpperCase() + food.status.slice(1)}
                    </span>
                </div>
            </div>

            {onAction && actionLabel && (
                <button
                    onClick={() => onAction(food.id)}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '1rem' }}
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

export default FoodCard;
