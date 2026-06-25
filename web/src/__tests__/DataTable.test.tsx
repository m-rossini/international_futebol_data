import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable, type Column } from "@/components/shared/DataTable";

interface TestRow {
  id: number;
  name: string;
  score: number;
}

const columns: Column<TestRow>[] = [
  { key: "id", header: "#" },
  { key: "name", header: "Name", sortable: true },
  { key: "score", header: "Score", sortable: true },
];

const data: TestRow[] = [
  { id: 1, name: "Alpha", score: 100 },
  { id: 2, name: "Beta", score: 200 },
  { id: 3, name: "Gamma", score: 50 },
];

describe("DataTable", () => {
  it("renders all rows", () => {
    render(<DataTable columns={columns} data={data} keyField="id" />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
  });

  it("renders column headers", () => {
    render(<DataTable columns={columns} data={data} keyField="id" />);
    expect(screen.getByText("#")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Score")).toBeInTheDocument();
  });

  it("shows empty state", () => {
    render(<DataTable columns={columns} data={[]} keyField="id" />);
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("sorts by string column ascending then descending", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={data} keyField="id" />);

    await user.click(screen.getByText("Name"));
    const rowsAsc = screen.getAllByRole("row").slice(1);
    expect(rowsAsc[0]).toHaveTextContent("Alpha");
    expect(rowsAsc[1]).toHaveTextContent("Beta");
    expect(rowsAsc[2]).toHaveTextContent("Gamma");

    await user.click(screen.getByText("Name"));
    const rowsDesc = screen.getAllByRole("row").slice(1);
    expect(rowsDesc[0]).toHaveTextContent("Gamma");
    expect(rowsDesc[1]).toHaveTextContent("Beta");
    expect(rowsDesc[2]).toHaveTextContent("Alpha");
  });

  it("sorts by numeric column ascending then descending", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={data} keyField="id" />);

    await user.click(screen.getByText("Score"));
    const rowsAsc = screen.getAllByRole("row").slice(1);
    expect(rowsAsc[0]).toHaveTextContent("Gamma");
    expect(rowsAsc[1]).toHaveTextContent("Alpha");
    expect(rowsAsc[2]).toHaveTextContent("Beta");

    await user.click(screen.getByText("Score"));
    const rowsDesc = screen.getAllByRole("row").slice(1);
    expect(rowsDesc[0]).toHaveTextContent("Beta");
    expect(rowsDesc[1]).toHaveTextContent("Alpha");
    expect(rowsDesc[2]).toHaveTextContent("Gamma");
  });

  it("uses defaultSort", () => {
    render(
      <DataTable columns={columns} data={data} keyField="id" defaultSort={{ key: "score", dir: "desc" }} />
    );
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Beta");
    expect(rows[1]).toHaveTextContent("Alpha");
    expect(rows[2]).toHaveTextContent("Gamma");
  });

  it("renders custom render functions", () => {
    const cols: Column<TestRow>[] = [
      ...columns,
      { key: "custom", header: "Custom", render: (row) => <span>⭐ {row.name}</span> },
    ];
    render(<DataTable columns={cols} data={data} keyField="id" />);
    expect(screen.getByText("⭐ Alpha")).toBeInTheDocument();
  });

  it("calls onRowClick when a row is clicked", async () => {
    const user = userEvent.setup();
    const clicked: TestRow[] = [];
    render(
      <DataTable
        columns={columns}
        data={data}
        keyField="id"
        onRowClick={(row) => clicked.push(row)}
      />
    );

    await user.click(screen.getByText("Alpha"));
    expect(clicked).toEqual([{ id: 1, name: "Alpha", score: 100 }]);
  });
});
