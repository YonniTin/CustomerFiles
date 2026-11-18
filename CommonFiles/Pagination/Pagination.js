sap.ui.define([
	"sap/ui/model/JSONModel",
	"sap/ui/model/Sorter",
	"ZSRE_319/controller/messages"
], function (JSONModel, Sorter, messages) {
	"use strict";

	// Reference implementation only. This file is not connected to List.controller.js.
	// To use the XML event names, mix these methods into the view controller.
	// All methods expect the controller context to provide getView(), getModel(), and byId().
	return {
		// Call during controller initialization. The table displays only pageModel>/results.
		initPaginationModels: function () {
			this.setModel(new JSONModel({ results: [] }), "pageModel");
			this.getView().setModel(new JSONModel({
				currentPage: 1,
				pageSize: 20,
				totalCount: 0,
				totalPages: 0,
				pageItems: []
			}), "paginationModel");
		},

		// Attach to SmartTable.beforeRebindTable after adding the view's filters.
		// preventTableBind stops SmartTable from binding all rows directly to OData.
		onBeforeRebindTable: function (oEvent) {
			var oBindingParams = oEvent.getParameter("bindingParams");
			var aSorters = [
				new Sorter("erdat", true),
				new Sorter("opp_no", true)
			];
			oBindingParams.sorter = aSorters;
			oBindingParams.preventTableBind = true;
			this._loadPage(1, oBindingParams.filters, aSorters);
		},

		// Reset paging and trigger the beforeRebindTable handler again when returning to the list.
		resetPagination: function () {
			var oPaginationModel = this.getView().getModel("paginationModel");
			oPaginationModel.setProperty("/currentPage", 1);
			oPaginationModel.setProperty("/totalCount", 0);
			oPaginationModel.setProperty("/totalPages", 0);
			this.byId("ConstractTable").clearSelection();
			this.byId("LineItemsSmartTable").rebindTable(true);
		},

		onPageSizeChange: function (oEvent) {
			var iPageSize = parseInt(oEvent.getSource().getSelectedKey(), 10);
			if (!isFinite(iPageSize) || iPageSize < 1) {
				return;
			}
			this.getView().getModel("paginationModel").setProperty("/pageSize", iPageSize);
			this._loadPage(1);
		},

		onPrevPage: function () {
			var iCurrentPage = this.getView().getModel("paginationModel").getProperty("/currentPage");
			if (iCurrentPage > 1) {
				this._goToPage(iCurrentPage - 1);
			}
		},

		onNextPage: function () {
			var oPaginationModel = this.getView().getModel("paginationModel");
			var iCurrentPage = oPaginationModel.getProperty("/currentPage");
			var iTotalPages = oPaginationModel.getProperty("/totalPages");
			if (iCurrentPage < iTotalPages) {
				this._goToPage(iCurrentPage + 1);
			}
		},

		onPageNumberPress: function (oEvent) {
			var oContext = oEvent.getSource().getBindingContext("paginationModel");
			var oPageItem = oContext && oContext.getObject();
			if (oPageItem && oPageItem.page) {
				this._goToPage(oPageItem.page);
			}
		},

		_goToPage: function (iPage) {
			var iTotalPages = this.getView().getModel("paginationModel").getProperty("/totalPages");
			if (iPage >= 1 && iPage <= iTotalPages) {
				this._loadPage(iPage);
			}
		},

		// Fetch exactly one page. OData V2 uses $skip/$top for the page and
		// $inlinecount=allpages to return the total count for the pager.
		_loadPage: function (iPage, aFilters, aSorters) {
			var oPaginationModel = this.getView().getModel("paginationModel");
			var iPageSize = oPaginationModel.getProperty("/pageSize");
			if (aFilters) {
				this._aPageFilters = aFilters.slice();
			}
			if (aSorters) {
				this._aPageSorters = aSorters.slice();
			}

			oPaginationModel.setProperty("/currentPage", iPage);
			this._updatePageItems();

			var oTable = this.byId("ConstractTable");
			oTable.clearSelection();
			oTable.setBusy(true);
			this.getView().getModel("pageModel").setProperty("/results", []);

			var that = this;
			var iRequestId = (this._iPageRequestId || 0) + 1;
			this._iPageRequestId = iRequestId;
			this.getModel().read("/ZCSRE_I_SSCFM_LIST", {
				filters: this._aPageFilters || [],
				sorters: this._aPageSorters || [],
				urlParameters: {
					"$skip": String((iPage - 1) * iPageSize),
					"$top": String(iPageSize),
					"$inlinecount": "allpages"
				},
				success: function (oData) {
					if (iRequestId !== that._iPageRequestId) {
						return;
					}
					oTable.setBusy(false);

					if (oData.__count === undefined || isNaN(parseInt(oData.__count, 10))) {
						oPaginationModel.setProperty("/totalCount", 0);
						oPaginationModel.setProperty("/totalPages", 0);
						that._updatePageItems();
						that.getView().getModel("pageModel").setProperty("/results", oData.results || []);
						messages.showError("OData response is missing __count; verify $inlinecount=allpages support.");
						return;
					}

					var iTotalCount = parseInt(oData.__count, 10);
					var iTotalPages = Math.ceil(iTotalCount / iPageSize);
					oPaginationModel.setProperty("/totalCount", iTotalCount);
					oPaginationModel.setProperty("/totalPages", iTotalPages);

					if (iPage > iTotalPages) {
						oPaginationModel.setProperty("/currentPage", iTotalPages || 1);
						if (iTotalPages > 0) {
							that._loadPage(iTotalPages);
						} else {
							that._updatePageItems();
						}
						return;
					}

					var aResults = oData.results || [];
					aResults.forEach(function (oResult) {
						var sEntityPath = that.getModel().getKey(oResult);
						if (!sEntityPath && oResult.__metadata) {
							sEntityPath = oResult.__metadata.uri;
						}
						if (sEntityPath && sEntityPath.charAt(0) !== "/" && sEntityPath.indexOf("://") === -1) {
							sEntityPath = "/" + sEntityPath;
						}
						var oGuidMatch = sEntityPath && sEntityPath.match(/guid'([^']+)'/i);
						oResult.__entityPath = sEntityPath;
						if (oGuidMatch) {
							oResult.guid = oGuidMatch[1];
						}
					});

					that.getView().getModel("pageModel").setProperty("/results", aResults);
					that._updatePageItems();
				},
				error: function (oError) {
					if (iRequestId !== that._iPageRequestId) {
						return;
					}
					oTable.setBusy(false);
					messages.showErrorAdapt(oError);
				}
			});
		},

		// Obtain selected data from the current-page JSON model rather than the OData row binding.
		_getSelectedRowData: function () {
			var aSelectedIndices = this.byId("ConstractTable").getSelectedIndices();
			if (!aSelectedIndices.length) {
				return null;
			}
			return this.getView().getModel("pageModel").getProperty("/results/" + aSelectedIndices[0]) || null;
		},

		// Keep up to five nearby page numbers visible, with ellipses for skipped ranges.
		_updatePageItems: function () {
			var oPaginationModel = this.getView().getModel("paginationModel");
			var iCurrentPage = oPaginationModel.getProperty("/currentPage");
			var iTotalPages = oPaginationModel.getProperty("/totalPages");
			var aPageItems = [];

			if (iTotalPages <= 7) {
				for (var i = 1; i <= iTotalPages; i++) {
					aPageItems.push(this._createPageItem(i, iCurrentPage));
				}
			} else if (iCurrentPage <= 4) {
				for (var j = 1; j <= 5; j++) {
					aPageItems.push(this._createPageItem(j, iCurrentPage));
				}
				aPageItems.push({ text: "...", enabled: false, type: "Transparent" });
				aPageItems.push(this._createPageItem(iTotalPages, iCurrentPage));
			} else if (iCurrentPage >= iTotalPages - 3) {
				aPageItems.push(this._createPageItem(1, iCurrentPage));
				aPageItems.push({ text: "...", enabled: false, type: "Transparent" });
				for (var k = iTotalPages - 4; k <= iTotalPages; k++) {
					aPageItems.push(this._createPageItem(k, iCurrentPage));
				}
			} else {
				aPageItems.push(this._createPageItem(1, iCurrentPage));
				aPageItems.push({ text: "...", enabled: false, type: "Transparent" });
				for (var m = iCurrentPage - 2; m <= iCurrentPage + 2; m++) {
					aPageItems.push(this._createPageItem(m, iCurrentPage));
				}
				aPageItems.push({ text: "...", enabled: false, type: "Transparent" });
				aPageItems.push(this._createPageItem(iTotalPages, iCurrentPage));
			}

			oPaginationModel.setProperty("/pageItems", aPageItems);
		},

		_createPageItem: function (iPage, iCurrentPage) {
			return {
				page: iPage,
				text: String(iPage),
				enabled: true,
				type: iPage === iCurrentPage ? "Emphasized" : "Default"
			};
		}
	};
});
