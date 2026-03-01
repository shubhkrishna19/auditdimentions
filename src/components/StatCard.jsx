// Stat Card Component for Dashboard KPIs

const StatCard = ({
    label,
    value,
    change = null,
    variant = 'default',
    icon = null
}) => {
    const formatChange = (val) => {
        if (val === null || val === undefined) return null;
        const prefix = val > 0 ? '+' : '';
        return `${prefix}${val}`;
    };

    return (
        <div className={`stat-card ${variant}`}>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
            {change !== null && (
                <div className={`stat-change ${change >= 0 ? 'positive' : 'negative'}`}>
                    {change >= 0 ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M7 17l5-5 5 5M7 7l5 5 5-5" />
                        </svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M7 7l5 5 5-5M7 17l5-5 5 5" />
                        </svg>
                    )}
                    {formatChange(change)}
                </div>
            )}
        </div>
    );
};

export default StatCard;
