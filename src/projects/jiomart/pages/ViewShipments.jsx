import React, { useState } from "react";

import {
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Modal,
  Box,
  Typography,
} from "@mui/material";
import PageLayout from "../../../components/PageLayout";

const sampleShipments = [
  {
    orderId: "ORD1234",
    shipmentId: "SHIP5678",
    type: "Express",
    status: "Delivered",
    vertical: "Fashion",
    price: "₹499",
    storeAssigned: "Store #42",
    awb: "AWB0012345",
  },
  {
    orderId: "ORD5678",
    shipmentId: "SHIP1234",
    type: "Standard",
    status: "In Transit",
    vertical: "Electronics",
    price: "₹999",
    storeAssigned: "Store #15",
    awb: "AWB0098765",
  },
  {
    orderId: "ORD9101",
    shipmentId: "SHIP4321",
    type: "Same Day",
    status: "Pending",
    vertical: "Grocery",
    price: "₹299",
    storeAssigned: "Store #87",
    awb: "AWB0043210",
  },
];

const ViewShipments = () => {
  const [searchType, setSearchType] = useState("Shipment");
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [open, setOpen] = useState(false);

  const handleChange = (event) => {
    setSearchType(event.target.value);
  };

  const handleOpen = (shipment) => {
    setSelectedShipment(shipment);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedShipment(null);
  };

  return (
    <PageLayout title="View Shipment" contentClassName="flex flex-1 flex-col">
      <div className="my-4 flex items-end justify-end">
        {/* Select Dropdown */}
        <FormControl
          sx={{
            m: 1,
            minWidth: 120,
            "& .MuiInputBase-root": {
              fontSize: "0.75rem",
              height: "32px",
              padding: "0 8px",
              color: "inherit",
              backgroundColor: "transparent",
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "gray",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#aaa",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#3b82f6",
            },
            "& label": {
              color: "gray",
              fontSize: "0.75rem",
            },
            "& label.Mui-focused": {
              color: "#3b82f6",
            },
            "& .MuiSelect-icon": {
              color: "gray", // ensures arrow is visible in dark mode
            },
          }}
          size="small"
        >
          <InputLabel id="search-type">Search type</InputLabel>
          <Select
            labelId="search-type"
            id="search-type"
            value={searchType}
            onChange={handleChange}
            label="Search Type"
            MenuProps={{
              PaperProps: {
                sx: {
                  bgcolor: "background.paper",
                  "& .MuiMenuItem-root": {
                    color: "#000", // black text
                    fontSize: "0.75rem",
                    minHeight: "42px",
                  },
                  "& .MuiMenuItem-root.Mui-selected": {
                    bgcolor: "rgba(59, 130, 246, 0.3)",
                    color: "#3b82f6",
                  },
                  "& .MuiMenuItem-root.Mui-selected:hover": {
                    bgcolor: "rgba(59, 130, 246, 0.4)",
                  },
                },
              },
            }}
          >
            <MenuItem value="Shipment">Shipment ID</MenuItem>
            <MenuItem value="Order">Order ID</MenuItem>
          </Select>
        </FormControl>

        {/* Text Input */}
        <TextField
          fullWidth
          label={`Enter ${searchType} ID`}
          size="small"
          sx={{
            m: 1,
            width: 300,
            input: {
              fontSize: "0.75rem",
              height: "32px",
              padding: "6px 8px",
              color: "inherit", // adapt to dark mode
              backgroundColor: "transparent",
            },
            "& .MuiOutlinedInput-root": {
              height: "32px",
              color: "inherit",
              backgroundColor: "transparent",
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "gray",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#aaa",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#3b82f6",
            },
            "& label": {
              fontSize: "0.75rem",
              color: "gray",
            },
            "& label.Mui-focused": {
              color: "#3b82f6",
            },
          }}
        />
      </div>

      {/* Table Section */}
      <div className="overflow-auto rounded-sm border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
          <thead className="bg-gray-200 dark:bg-black">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Order Id</th>
              <th className="px-4 py-3 text-left font-semibold">Shipment Id</th>
              <th className="px-4 py-3 text-left font-semibold">Type</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Vertical</th>
              <th className="px-4 py-3 text-left font-semibold">Price</th>
              <th className="px-4 py-3 text-left font-semibold">
                Store assigned
              </th>
              <th className="px-4 py-3 text-left font-semibold">AWB</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-light dark:divide-gray-800">
            {sampleShipments.map((shipment, idx) => (
              <tr
                key={idx}
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => handleOpen(shipment)}
              >
                <td className="px-5 py-6">{shipment.orderId}</td>
                <td className="px-5 py-6">{shipment.shipmentId}</td>
                <td className="px-5 py-6">{shipment.type}</td>
                <td className="px-5 py-6">{shipment.status}</td>
                <td className="px-5 py-6">{shipment.vertical}</td>
                <td className="px-5 py-6">{shipment.price}</td>
                <td className="px-5 py-6">{shipment.storeAssigned}</td>
                <td className="px-5 py-6">{shipment.awb}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal open={open} onClose={handleClose}>
        <Box className="absolute top-1/2 left-1/2 w-[90%] max-w-lg -translate-x-1/2 -translate-y-1/2 transform rounded-md bg-white p-6 shadow-lg dark:bg-gray-900">
          {selectedShipment && (
            <div className="space-y-2 text-sm">
              <div>
                <strong>Order ID:</strong> {selectedShipment.orderId}
              </div>
              <div>
                <strong>Shipment ID:</strong> {selectedShipment.shipmentId}
              </div>
              <div>
                <strong>Type:</strong> {selectedShipment.type}
              </div>
              <div>
                <strong>Status:</strong> {selectedShipment.status}
              </div>
              <div>
                <strong>Vertical:</strong> {selectedShipment.vertical}
              </div>
              <div>
                <strong>Price:</strong> {selectedShipment.price}
              </div>
              <div>
                <strong>Store Assigned:</strong>{" "}
                {selectedShipment.storeAssigned}
              </div>
              <div>
                <strong>AWB:</strong> {selectedShipment.awb}
              </div>
            </div>
          )}
        </Box>
      </Modal>
    </PageLayout>
  );
};

export default ViewShipments;
