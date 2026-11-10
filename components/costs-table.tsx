import Link from "next/link";
import { formatCents } from "@/lib/format";
import type { Cost } from "@/lib/queries";
import { StatusBadge } from "@/components/status-badge";

export function CostsTable({ projectId, costs }: { projectId: string; costs: Cost[] }) {
  if (costs.length === 0) {
    return <p className="text-zinc-500">No costs yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b text-zinc-500">
          <tr>
            <th className="py-2 pr-4 font-medium">Date</th>
            <th className="py-2 pr-4 font-medium">Category</th>
            <th className="py-2 pr-4 font-medium">Supplier</th>
            <th className="py-2 pr-4 font-medium">Description</th>
            <th className="py-2 pr-4 text-right font-medium">Net</th>
            <th className="py-2 pr-4 text-right font-medium">VAT</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {costs.map((cost) => (
            <tr key={cost.id} className="border-b">
              <td className="py-2 pr-4 whitespace-nowrap">{cost.costDate}</td>
              <td className="py-2 pr-4 capitalize">{cost.category}</td>
              <td className="py-2 pr-4">{cost.supplier}</td>
              <td className="py-2 pr-4">{cost.description}</td>
              <td className="py-2 pr-4 text-right whitespace-nowrap">{formatCents(cost.amountCents)}</td>
              <td className="py-2 pr-4 text-right whitespace-nowrap">{formatCents(cost.vatCents)}</td>
              <td className="py-2 pr-4">
                <StatusBadge status={cost.status} />
              </td>
              <td className="py-2 text-right">
                <Link
                  href={`/projects/${projectId}/costs/${cost.id}/edit`}
                  className="text-blue-600 hover:underline"
                >
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
