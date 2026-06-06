/**
 * StockBySizeEditor Component
 * Allows editing stock details for different sizes
 * Each size has: bridge_length, temple_length, lens_width, quantity
 */

import React, { useState, useEffect } from 'react';
import './StockBySizeEditor.css';

const StockBySizeEditor = ({ 
  initialData = {}, 
  onChange = () => {},
  availableSizes = ['small', 'medium', 'large', 'XL']
}) => {
  const [stockBySize, setStockBySize] = useState(initialData || {});
  const [error, setError] = useState(null);

  useEffect(() => {
    setStockBySize(initialData || {});
  }, [initialData]);

  const handleSizeFieldChange = (size, field, value) => {
    setError(null);
    
    // Ensure size object exists
    if (!stockBySize[size]) {
      stockBySize[size] = {
        bridge_length: '',
        temple_length: '',
        lens_width: '',
        quantity: 0
      };
    }

    // Update the specific field
    if (field === 'quantity') {
      stockBySize[size][field] = parseInt(value) || 0;
    } else {
      stockBySize[size][field] = value;
    }

    const updatedData = { ...stockBySize };
    setStockBySize(updatedData);
    onChange(updatedData);
  };

  const toggleSize = (size) => {
    const newData = { ...stockBySize };
    if (newData[size]) {
      delete newData[size];
    } else {
      newData[size] = {
        bridge_length: '',
        temple_length: '',
        lens_width: '',
        quantity: 0
      };
    }
    setStockBySize(newData);
    onChange(newData);
  };

  const getSizeData = (size) => {
    return stockBySize[size] || {
      bridge_length: '',
      temple_length: '',
      lens_width: '',
      quantity: 0
    };
  };

  const getTotalQuantity = () => {
    return Object.values(stockBySize).reduce((sum, sizeData) => {
      return sum + (sizeData?.quantity || 0);
    }, 0);
  };

  return (
    <div className="stock-by-size-editor">
      <div className="editor-header">
        <h3>Stock by Size</h3>
        <div className="total-stock">
          <span className="label">Total Stock:</span>
          <span className="value">{getTotalQuantity()}</span>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="sizes-grid">
        {availableSizes.map((size) => {
          const isSelected = !!stockBySize[size];
          const sizeData = getSizeData(size);

          return (
            <div key={size} className={`size-card ${isSelected ? 'active' : ''}`}>
              <div className="size-header">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSize(size)}
                  className="size-toggle"
                />
                <label className="size-name">{size.toUpperCase()}</label>
              </div>

              {isSelected && (
                <div className="size-fields">
                  {/* Bridge Length */}
                  <div className="field-group">
                    <label htmlFor={`${size}-bridge`}>Bridge Length</label>
                    <input
                      id={`${size}-bridge`}
                      type="text"
                      placeholder="e.g., 14mm"
                      value={sizeData.bridge_length}
                      onChange={(e) =>
                        handleSizeFieldChange(size, 'bridge_length', e.target.value)
                      }
                      className="input-field"
                    />
                  </div>

                  {/* Temple Length */}
                  <div className="field-group">
                    <label htmlFor={`${size}-temple`}>Temple Length</label>
                    <input
                      id={`${size}-temple`}
                      type="text"
                      placeholder="e.g., 135mm"
                      value={sizeData.temple_length}
                      onChange={(e) =>
                        handleSizeFieldChange(size, 'temple_length', e.target.value)
                      }
                      className="input-field"
                    />
                  </div>

                  {/* Lens Width */}
                  <div className="field-group">
                    <label htmlFor={`${size}-lens`}>Lens Width</label>
                    <input
                      id={`${size}-lens`}
                      type="text"
                      placeholder="e.g., 50mm"
                      value={sizeData.lens_width}
                      onChange={(e) =>
                        handleSizeFieldChange(size, 'lens_width', e.target.value)
                      }
                      className="input-field"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="field-group">
                    <label htmlFor={`${size}-qty`}>Quantity</label>
                    <input
                      id={`${size}-qty`}
                      type="number"
                      min="0"
                      value={sizeData.quantity}
                      onChange={(e) =>
                        handleSizeFieldChange(size, 'quantity', e.target.value)
                      }
                      className="input-field quantity-input"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* JSON Preview (Optional for debugging) */}
      <details className="json-preview">
        <summary>JSON Preview</summary>
        <pre>{JSON.stringify(stockBySize, null, 2)}</pre>
      </details>
    </div>
  );
};

export default StockBySizeEditor;
