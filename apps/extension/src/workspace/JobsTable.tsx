import type { Opportunity } from "@workit/domain";

interface JobsTableProps {
  opportunities: Opportunity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function JobsTable({
  opportunities,
  selectedId,
  onSelect,
}: JobsTableProps) {
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  if (opportunities.length === 0) {
    return (
      <div className="empty-state-view" data-testid="jobs-empty-state">
        <p style={{ fontWeight: 500, color: "var(--text)" }}>No opportunities found</p>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
          Save jobs while browsing to review and track them here.
        </p>
      </div>
    );
  }

  return (
    <div className="table-pane">
      <table className="jobs-table" data-testid="jobs-table">
        <thead>
          <tr>
            <th>Opportunity</th>
            <th style={{ width: 120 }}>Status</th>
            <th style={{ width: 110, textAlign: "right" }}>Updated</th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((opp) => {
            const isSelected = opp.id === selectedId;
            return (
              <tr
                key={opp.id}
                className={`table-row ${isSelected ? "is-selected" : ""}`}
                onClick={() => onSelect(opp.id)}
                data-testid={`opportunity-row-${opp.id}`}
                data-opportunity-id={opp.id}
              >
                <td>
                  <div className="opp-title-cell" data-testid="opp-row-title">{opp.title}</div>
                  <div className="opp-company-sub">
                    {opp.company}
                    {opp.location ? ` · ${opp.location}` : ""}
                  </div>
                </td>
                <td>
                  <span className={`status-badge ${opp.state}`} data-testid="opp-row-status">
                    {opp.state}
                  </span>
                </td>
                <td style={{ textAlign: "right", color: "var(--text-faint)", fontSize: 12 }}>
                  {formatDate(opp.updatedAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
