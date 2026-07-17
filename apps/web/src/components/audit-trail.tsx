import type { AuditEntry } from "@rokade/db";
import { describeAuditEntry, formatAuditTime } from "@/lib/format";

/** The rows of an audit trail; callers provide the surrounding heading. */
export function AuditTable({ entries }: { entries: AuditEntry[] }) {
  return (
    <div className="table-wrap">
      <table>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="left muted">{formatAuditTime(entry.at)}</td>
              <td className="left">{entry.userEmail}</td>
              <td className="left">{describeAuditEntry(entry)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
