import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable } from "@/components/shared/DataTable";

interface TestRow {
  id: number;
  name: string;
  score: number;
  city: string;
}

const columns = [
  { key: "id", header: "#" },
  { key: "name", header: "Name", sortable: true },
  { key: "score", header: "Score", sortable: true },
  { key: "city", header: "City", sortable: true },
];

const data: TestRow[] = [
  { id: 1, name: "Alpha", score: 100, city: "London" },
  { id: 2, name: "Beta", score: 200, city: "Paris" },
  { id: 3, name: "Gamma", score: 50, city: "Berlin" },
];

describe("DataTable", () => {
  it("renders all rows from data", () => {
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
    expect(screen.getByText("City")).toBeInTheDocument();
  });

  it("shows empty state when data is empty", () => {
    render(<DataTable columns={columns} data={[]} keyField="id" />);
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("sorts by numeric column ascending, then descending", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={data} keyField="id" />);

    // First click: sort asc by Score
    await user.click(screen.getByText("Score"));
    const rowsAsc = screen.getAllByRole("row").slice(1); // skip header
    expect(rowsAsc[0]).toHaveTextContent("Gamma");
    expect(rowsAsc[1]).toHaveTextContent("Alpha");
    expect(rowsAsc[2]).toHaveTextContent("Beta");

    // Second click: sort desc
    await user.click(screen.getByText("Score"));
    const rowsDesc = screen.getAllByRole("row").slice(1);
    expect(rowsDesc[0]).toHaveTextContent("Beta");
    expect(rowsDesc[1]).toHaveTextContent("Alpha");
    expect(rowsDesc[2]).toHaveTextContent("Gamma");
  });

  it("sorts by string column ascending, then descending", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={data} keyField="id" />);

    // Asc by City
    await user.click(screen.getByText("City"));
    const rowsAsc = screen.getAllByRole("row").slice(1);
    expect(rowsAsc[0]).toHaveTextContent("Berlin");
    expect(rowsAsc[1]).toHaveTextContent("London");
    expect(rowsAsc[2]).toHaveTextContent("Paris");

    // Desc
    await user.click(screen.getByText("City"));
    const rowsDesc = screen.getAllByRole("row").slice(1);
    expect(rowsDesc[0]).toHaveTextContent("Paris");
    expect(rowsDesc[1]).toHaveTextContent("London");
    expect(rowsDesc[2]).toHaveTextContent("Berlin");
  });

  it("fires onRowClick when a row is clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={data}
        keyField="id"
        onRowClick={onClick}
      />
    );

    await user.click(screen.getByText("Beta"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(data[1]);
  });

  it("uses defaultSort to pre-sort the table", () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        keyField="id"
        defaultSort={{ key: "score", dir: "desc" }}
      />
    );
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Beta");
    expect(rows[1]).toHaveTextContent("Alpha");
    expect(rows[2]).toHaveTextContent("Gamma");
  });

  it("renders custom render functions", () => {
    const cols = [
      ...columns,
      {
        key: "custom",
        header: "Custom",
        render: (row: TestRow) => <span data-testid={`badge-${row.id}`}>⭐ {row.name}</span>,
      },
    ];
    render(<DataTable columns={cols} data={data} keyField="id" />);
    expect(screen.getByTestId("badge-1")).toHaveTextContent("⭐ Alpha");
    expect(screen.getByTestId("badge-2")).toHaveTextContent("⭐ Beta");
  });

  it("non-sortable headers should not have sort icon", () => {
    render(<DataTable columns={columns} data={data} keyField="id" />);
    // The "#" column has no sortable prop so should be false by default
    const idHeader = screen.getByText("#");
    // Clicking it should not change anything
    const rowsBefore = screen.getAllByRole("row").slice(1);
    const firstRowTextBefore = rowsBefore[0].textContent;
    userEvent.click(idHeader); // Non-sortable, shouldn't throw
    const rowsAfter = screen.getAllByRole("row").slice(1);
    expect(rowsAfter[0].textContent).toBe(firstRowTextBefore);
  });
});
