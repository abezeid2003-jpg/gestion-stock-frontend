import { useState, useEffect } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

function App() {
  const API = "https://gestion-stock-backend-5qm3.onrender.com";

  const [page, setPage] = useState("stock");
  const [donnees, setDonnees] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState({ produits: 0, clients: 0, fournisseurs: 0, rupture: 0 });
  const [fournisseurs, setFournisseurs] = useState([]);
  const [clients, setClients] = useState([]);
  const [produits, setProduits] = useState([]);
  const [bon, setBon] = useState({ numero_bon: "", date_bon: "", id_fournisseur: "", id_client: "", observation: "" });
  const [lignes, setLignes] = useState([{ id_produit: "", quantite: "", prix_unitaire: "" }]);
  const [newProduit, setNewProduit] = useState({ code_produit: "", designation: "", unite: "", prix_achat: "", prix_vente: "", stock_minimum: "" });
  const [newClient, setNewClient] = useState({ code_client: "", nom: "", telephone: "", adresse: "" });
  const [newFournisseur, setNewFournisseur] = useState({ code_fournisseur: "", nom: "", telephone: "", adresse: "" });
  const [showForm, setShowForm] = useState(false);
  const [bonDetail, setBonDetail] = useState(null);
  const [lignesDetail, setLignesDetail] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [elementAModifier, setElementAModifier] = useState(null);
  const [bonEnEdition, setBonEnEdition] = useState(null);
  const [lignesEdition, setLignesEdition] = useState([]);
  const [showEditBon, setShowEditBon] = useState(false);
  const [stockData, setStockData] = useState([]);
  const [showAlertes, setShowAlertes] = useState(false);
  const [produitSelectionne, setProduitSelectionne] = useState("");
  const [ficheMouvements, setFicheMouvements] = useState(null);
  const [loadingMouvements, setLoadingMouvements] = useState(false);

  // 📊 ETATS FICHE DE STOCK
  const [ficheStockDateDebut, setFicheStockDateDebut] = useState("");
  const [ficheStockDateFin, setFicheStockDateFin] = useState("");
  const [ficheStockDatePrecise, setFicheStockDatePrecise] = useState("");
  const [ficheStockMode, setFicheStockMode] = useState("periode"); // "periode" ou "date"
  const [ficheStockData, setFicheStockData] = useState(null);
  const [loadingFicheStock, setLoadingFicheStock] = useState(false);

  const chargerStats = () => {
    Promise.all([
      fetch(`${API}/produits`).then((r) => r.json()),
      fetch(`${API}/clients`).then((r) => r.json()),
      fetch(`${API}/fournisseurs`).then((r) => r.json()),
      fetch(`${API}/stock`).then((r) => r.json()),
    ]).then(([produits, clients, fournisseurs, stock]) => {
      setStats({
        produits: produits.length,
        clients: clients.length,
        fournisseurs: fournisseurs.length,
        rupture: stock.filter((s) => Number(s.stock_actuel) <= 0).length,
      });
      setFournisseurs(fournisseurs);
      setClients(clients);
      setProduits(produits);
      setStockData(stock);
    });
  };

  useEffect(() => { chargerStats(); }, []);

  useEffect(() => {
    if (["bon-entree", "bon-sortie", "mouvements", "fiche-stock"].includes(page)) return;
    setLoading(true);
    setDonnees([]);
    setRecherche("");
    setShowForm(false);
    setMessage("");
    setBonDetail(null);
    setShowEditBon(false);
    const url = page === "liste-entree" ? `${API}/bons-entree`
      : page === "liste-sortie" ? `${API}/bons-sortie`
      : `${API}/${page}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => { setDonnees(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page]);

  const produitsRuptureTotale = stockData.filter((s) => Number(s.stock_actuel) <= 0);
  const produitsStockFaible = stockData.filter((s) =>
    Number(s.stock_actuel) > 0 && s.stock_minimum !== null &&
    Number(s.stock_actuel) <= Number(s.stock_minimum)
  );
  const totalAlertes = produitsRuptureTotale.length + produitsStockFaible.length;

  const dataStockActuel = stockData.map((s) => ({
    name: s.code_produit, designation: s.designation,
    "Stock Actuel": Number(s.stock_actuel), "Stock Minimum": Number(s.stock_minimum) || 0,
  }));
  const dataEntreesSorties = stockData.map((s) => ({
    name: s.code_produit, designation: s.designation,
    "Entrees": Number(s.total_entree), "Sorties": Number(s.total_sortie),
  }));

  const resetBon = () => {
    setBon({ numero_bon: "", date_bon: "", id_fournisseur: "", id_client: "", observation: "" });
    setLignes([{ id_produit: "", quantite: "", prix_unitaire: "" }]);
    setMessage("");
  };

  const ajouterLigne = () => setLignes([...lignes, { id_produit: "", quantite: "", prix_unitaire: "" }]);
  const supprimerLigne = (index) => setLignes(lignes.filter((_, i) => i !== index));
  const modifierLigne = (index, champ, valeur) => {
    const newLignes = [...lignes]; newLignes[index][champ] = valeur; setLignes(newLignes);
  };
  const ajouterLigneEdition = () => setLignesEdition([...lignesEdition, { id_produit: "", quantite: "", prix_unitaire: "" }]);
  const supprimerLigneEdition = (index) => setLignesEdition(lignesEdition.filter((_, i) => i !== index));
  const modifierLigneEdition = (index, champ, valeur) => {
    const newLignes = [...lignesEdition]; newLignes[index][champ] = valeur; setLignesEdition(newLignes);
  };

  const soumettreBon = async (type) => {
    if (!bon.numero_bon || !bon.date_bon) { setMessage("Champs obligatoires manquants !"); return; }
    if (type === "bon-entree" && !bon.id_fournisseur) { setMessage("Choisissez un fournisseur !"); return; }
    if (type === "bon-sortie" && !bon.id_client) { setMessage("Choisissez un client !"); return; }
    const body = type === "bon-entree"
      ? { numero_bon: bon.numero_bon, date_bon: bon.date_bon, id_fournisseur: bon.id_fournisseur, observation: bon.observation, lignes }
      : { numero_bon: bon.numero_bon, date_bon: bon.date_bon, id_client: bon.id_client, observation: bon.observation, lignes };
    try {
      const response = await fetch(`${API}/${type}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (data.success) { setMessage("Bon enregistre avec succes !"); resetBon(); chargerStats(); }
      else { setMessage("Erreur : " + data.error); }
    } catch (err) { setMessage("Erreur de connexion !"); }
  };

  const ajouterElement = async () => {
    let url = "", body = {};
    if (page === "produits") { url = `${API}/produits`; body = newProduit; }
    else if (page === "clients") { url = `${API}/clients`; body = newClient; }
    else if (page === "fournisseurs") { url = `${API}/fournisseurs`; body = newFournisseur; }
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (data.success) {
        setMessage("Ajoute avec succes !"); setShowForm(false);
        setNewProduit({ code_produit: "", designation: "", unite: "", prix_achat: "", prix_vente: "", stock_minimum: "" });
        setNewClient({ code_client: "", nom: "", telephone: "", adresse: "" });
        setNewFournisseur({ code_fournisseur: "", nom: "", telephone: "", adresse: "" });
        fetch(`${API}/${page}`).then((r) => r.json()).then(setDonnees); chargerStats();
      } else { setMessage("Erreur : " + data.error); }
    } catch (err) { setMessage("Erreur de connexion !"); }
  };

  const supprimerElement = async (id) => {
    if (!window.confirm("Confirmer la suppression ?")) return;
    let url = "";
    if (page === "produits") url = `${API}/produits/${id}`;
    else if (page === "clients") url = `${API}/clients/${id}`;
    else if (page === "fournisseurs") url = `${API}/fournisseurs/${id}`;
    try {
      const response = await fetch(url, { method: "DELETE" });
      const data = await response.json();
      if (data.success) { setMessage("Supprime avec succes !"); fetch(`${API}/${page}`).then((r) => r.json()).then(setDonnees); chargerStats(); }
      else { setMessage("Erreur : " + data.error); }
    } catch (err) { setMessage("Erreur de connexion !"); }
  };

  const ouvrirModification = (element) => { setElementAModifier({ ...element }); setShowEditModal(true); };

  const enregistrerModification = async () => {
    let url = "";
    if (page === "produits") url = `${API}/produits/${elementAModifier.id_produit}`;
    else if (page === "clients") url = `${API}/clients/${elementAModifier.id_client}`;
    else if (page === "fournisseurs") url = `${API}/fournisseurs/${elementAModifier.id_fournisseur}`;
    try {
      const response = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(elementAModifier) });
      const data = await response.json();
      if (data.id_produit || data.id_client || data.id_fournisseur) {
        setMessage("Modifie avec succes !"); setShowEditModal(false); setElementAModifier(null);
        fetch(`${API}/${page}`).then((r) => r.json()).then(setDonnees); chargerStats();
      } else { setMessage("Erreur lors de la modification !"); }
    } catch (err) { setMessage("Erreur de connexion !"); }
  };

  const ouvrirModificationBon = async (bonData, type) => {
    setBonEnEdition({ ...bonData, _type: type });
    const url = type === "entree" ? `${API}/bons-entree/${bonData.id_bon_entree}/lignes` : `${API}/bons-sortie/${bonData.id_bon_sortie}/lignes`;
    const lignesData = await fetch(url).then((r) => r.json());
    setLignesEdition(lignesData.map((l) => ({ id_produit: l.id_produit, quantite: l.quantite, prix_unitaire: l.prix_unitaire })));
    setShowEditBon(true); setBonDetail(null);
  };

  const enregistrerModificationBon = async () => {
    const type = bonEnEdition._type;
    const id = type === "entree" ? bonEnEdition.id_bon_entree : bonEnEdition.id_bon_sortie;
    const url = type === "entree" ? `${API}/bons-entree/${id}` : `${API}/bons-sortie/${id}`;
    const body = type === "entree"
      ? { numero_bon: bonEnEdition.numero_bon, date_bon: bonEnEdition.date_bon, id_fournisseur: bonEnEdition.id_fournisseur, observation: bonEnEdition.observation, lignes: lignesEdition }
      : { numero_bon: bonEnEdition.numero_bon, date_bon: bonEnEdition.date_bon, id_client: bonEnEdition.id_client, observation: bonEnEdition.observation, lignes: lignesEdition };
    try {
      const response = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (data.success) {
        setMessage("Bon modifie avec succes !"); setShowEditBon(false); setBonEnEdition(null);
        const listeUrl = type === "entree" ? `${API}/bons-entree` : `${API}/bons-sortie`;
        fetch(listeUrl).then((r) => r.json()).then(setDonnees); chargerStats();
      } else { setMessage("Erreur : " + data.error); }
    } catch (err) { setMessage("Erreur de connexion !"); }
  };

  const supprimerBon = async (id, type) => {
    if (!window.confirm("Confirmer la suppression de ce bon ?")) return;
    const url = type === "entree" ? `${API}/bons-entree/${id}` : `${API}/bons-sortie/${id}`;
    try {
      const response = await fetch(url, { method: "DELETE" });
      const data = await response.json();
      if (data.success) {
        setMessage("Bon supprime avec succes !"); setBonDetail(null);
        const listeUrl = type === "entree" ? `${API}/bons-entree` : `${API}/bons-sortie`;
        fetch(listeUrl).then((r) => r.json()).then(setDonnees); chargerStats();
      } else { setMessage("Erreur : " + data.error); }
    } catch (err) { setMessage("Erreur de connexion !"); }
  };

  const voirDetailBon = async (bon, type) => {
    setBonDetail(bon);
    const url = type === "entree" ? `${API}/bons-entree/${bon.id_bon_entree}/lignes` : `${API}/bons-sortie/${bon.id_bon_sortie}/lignes`;
    const lignes = await fetch(url).then((r) => r.json());
    setLignesDetail(lignes);
  };

  const chargerMouvements = async () => {
    if (!produitSelectionne) return;
    setLoadingMouvements(true); setFicheMouvements(null);
    try {
      const data = await fetch(`${API}/mouvements/${produitSelectionne}`).then((r) => r.json());
      setFicheMouvements(data);
    } catch (err) { setMessage("Erreur de chargement des mouvements !"); }
    setLoadingMouvements(false);
  };

  // 📊 CHARGER FICHE DE STOCK
  const chargerFicheStock = async () => {
    let dateDebut, dateFin;
    if (ficheStockMode === "date") {
      if (!ficheStockDatePrecise) { setMessage("Veuillez choisir une date !"); return; }
      dateDebut = ficheStockDatePrecise;
      dateFin = ficheStockDatePrecise;
    } else {
      if (!ficheStockDateDebut || !ficheStockDateFin) { setMessage("Veuillez choisir les deux dates !"); return; }
      dateDebut = ficheStockDateDebut;
      dateFin = ficheStockDateFin;
    }
    setLoadingFicheStock(true); setFicheStockData(null);
    try {
      const data = await fetch(`${API}/fiche-stock?date_debut=${dateDebut}&date_fin=${dateFin}`).then((r) => r.json());
      setFicheStockData({ lignes: data, dateDebut, dateFin });
    } catch (err) { setMessage("Erreur de chargement de la fiche de stock !"); }
    setLoadingFicheStock(false);
  };

  // 📊 IMPRESSION PDF FICHE DE STOCK
  const imprimerFicheStockPDF = () => {
    if (!ficheStockData) return;
    const doc = new jsPDF();
    const couleur = [13, 110, 253];

    doc.setFillColor(...couleur);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("GESTION DE STOCK", 105, 13, { align: "center" });
    doc.setFontSize(13);
    doc.text("FICHE DE STOCK", 105, 23, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    if (ficheStockData.dateDebut === ficheStockData.dateFin) {
      doc.text(`Date : ${ficheStockData.dateDebut}`, 15, 42);
    } else {
      doc.text(`Periode : du ${ficheStockData.dateDebut} au ${ficheStockData.dateFin}`, 15, 42);
    }

    doc.setDrawColor(...couleur);
    doc.setLineWidth(0.5);
    doc.line(15, 48, 195, 48);

    autoTable(doc, {
      startY: 53,
      head: [["Code", "Designation", "Unite", "Stock Initial", "Total Entrees", "Total Sorties", "Stock Disponible"]],
      body: ficheStockData.lignes.map((l) => [
        l.code_produit,
        l.designation,
        l.unite,
        Number(l.stock_initial).toFixed(2),
        Number(l.total_entrees).toFixed(2),
        Number(l.total_sorties).toFixed(2),
        Number(l.stock_disponible).toFixed(2),
      ]),
      headStyles: { fillColor: couleur, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [249, 249, 249] },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 55 },
        2: { cellWidth: 18 },
        3: { cellWidth: 23, halign: "right" },
        4: { cellWidth: 23, halign: "right" },
        5: { cellWidth: 23, halign: "right" },
        6: { cellWidth: 28, halign: "right" },
      },
    });

    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Document genere le ${new Date().toLocaleDateString("fr-FR")} a ${new Date().toLocaleTimeString("fr-FR")}`,
      105, pageHeight - 10, { align: "center" }
    );
    doc.save(`Fiche_Stock_${ficheStockData.dateDebut}_${ficheStockData.dateFin}.pdf`);
  };

  const construireTableauMouvements = () => {
    if (!ficheMouvements) return [];
    const { stock_initial, entrees, sorties } = ficheMouvements;
    let lignesMouvements = [];
    lignesMouvements.push({
      date: stock_initial.date_saisie ? stock_initial.date_saisie.substring(0, 10) : "-",
      numero_bon: "-", type: "Stock Initial", tiers: "-", entree: "-", sortie: "-",
      stock: Number(stock_initial.quantite) || 0, _classe: "table-info fw-bold",
    });
    const mouvements = [
      ...entrees.map((e) => ({ ...e, _type: "entree" })),
      ...sorties.map((s) => ({ ...s, _type: "sortie" })),
    ].sort((a, b) => new Date(a.date_bon) - new Date(b.date_bon));
    let stockCourant = Number(stock_initial.quantite) || 0;
    mouvements.forEach((m) => {
      if (m._type === "entree") {
        stockCourant += Number(m.quantite);
        lignesMouvements.push({ date: m.date_bon.substring(0, 10), numero_bon: m.numero_bon, type: "Entree", tiers: m.nom_fournisseur, entree: Number(m.quantite), sortie: "-", stock: stockCourant, _classe: "table-success" });
      } else {
        stockCourant -= Number(m.quantite);
        lignesMouvements.push({ date: m.date_bon.substring(0, 10), numero_bon: m.numero_bon, type: "Sortie", tiers: m.nom_client, entree: "-", sortie: Number(m.quantite), stock: stockCourant, _classe: "table-danger" });
      }
    });
    return lignesMouvements;
  };

  const imprimerBonPDF = (type) => {
    const doc = new jsPDF();
    const estEntree = type === "entree";
    const titre = estEntree ? "BON D'ENTREE" : "BON DE SORTIE";
    const couleur = estEntree ? [13, 110, 253] : [25, 135, 84];
    doc.setFillColor(...couleur); doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.setFont("helvetica", "bold");
    doc.text("GESTION DE STOCK", 105, 13, { align: "center" });
    doc.setFontSize(13); doc.text(titre, 105, 23, { align: "center" });
    doc.setTextColor(0, 0, 0); doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("Numero du Bon :", 15, 42); doc.text("Date :", 15, 52);
    doc.text(estEntree ? "Fournisseur :" : "Client :", 15, 62); doc.text("Observation :", 15, 72);
    doc.setFont("helvetica", "normal");
    doc.text(bonDetail.numero_bon || "-", 60, 42);
    doc.text(bonDetail.date_bon?.substring(0, 10) || "-", 60, 52);
    doc.text(estEntree ? (bonDetail.nom_fournisseur || "-") : (bonDetail.nom_client || "-"), 60, 62);
    doc.text(bonDetail.observation || "-", 60, 72);
    doc.setDrawColor(...couleur); doc.setLineWidth(0.5); doc.line(15, 78, 195, 78);
    const formatMontant = (val) => Number(val).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    const totalGeneral = lignesDetail.reduce((sum, l) => sum + Number(l.montant || 0), 0);
    autoTable(doc, {
      startY: 83,
      head: [["Code", "Designation", "Quantite", "Prix Unitaire", "Montant (MRU)"]],
      body: lignesDetail.map((l) => [l.code_produit || "-", l.designation || "-", l.quantite, formatMontant(l.prix_unitaire), formatMontant(l.montant)]),
      foot: [["", "", "", "TOTAL GENERAL :", formatMontant(totalGeneral) + " MRU"]],
      headStyles: { fillColor: couleur, textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [249, 249, 249] },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 70 }, 2: { cellWidth: 25, halign: "center" }, 3: { cellWidth: 35, halign: "right" }, 4: { cellWidth: 35, halign: "right" } },
    });
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(9); doc.setTextColor(150, 150, 150);
    doc.text(`Document genere le ${new Date().toLocaleDateString("fr-FR")} a ${new Date().toLocaleTimeString("fr-FR")}`, 105, pageHeight - 10, { align: "center" });
    doc.save(`${titre.replace(" ", "_")}_${bonDetail.numero_bon}.pdf`);
  };

  // 📊 PAGE FICHE DE STOCK
  const renderFicheStock = () => (
    <div>
      <h4 className="mb-4">📊 Fiche de Stock</h4>

      {/* Filtres */}
      <div className="card p-3 mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-md-3">
            <label className="form-label fw-bold">Mode de filtre</label>
            <select className="form-select" value={ficheStockMode} onChange={(e) => { setFicheStockMode(e.target.value); setFicheStockData(null); }}>
              <option value="periode">Periode (date debut → date fin)</option>
              <option value="date">Date precise</option>
            </select>
          </div>
          {ficheStockMode === "date" ? (
            <div className="col-md-3">
              <label className="form-label fw-bold">Date</label>
              <input type="date" className="form-control" value={ficheStockDatePrecise}
                onChange={(e) => { setFicheStockDatePrecise(e.target.value); setFicheStockData(null); }} />
            </div>
          ) : (
            <>
              <div className="col-md-3">
                <label className="form-label fw-bold">Date Debut</label>
                <input type="date" className="form-control" value={ficheStockDateDebut}
                  onChange={(e) => { setFicheStockDateDebut(e.target.value); setFicheStockData(null); }} />
              </div>
              <div className="col-md-3">
                <label className="form-label fw-bold">Date Fin</label>
                <input type="date" className="form-control" value={ficheStockDateFin}
                  onChange={(e) => { setFicheStockDateFin(e.target.value); setFicheStockData(null); }} />
              </div>
            </>
          )}
          <div className="col-md-3">
            <button className="btn btn-primary w-100" onClick={chargerFicheStock}>
              🔍 Afficher la Fiche
            </button>
          </div>
        </div>
      </div>

      {/* Chargement */}
      {loadingFicheStock && (
        <div className="text-center my-4">
          <div className="spinner-border text-primary"></div>
          <p className="mt-2">Chargement...</p>
        </div>
      )}

      {/* Résultats */}
      {ficheStockData && !loadingFicheStock && (
        <div className="card p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="text-primary">
              {ficheStockData.dateDebut === ficheStockData.dateFin
                ? `📅 Stock au ${ficheStockData.dateDebut}`
                : `📅 Stock du ${ficheStockData.dateDebut} au ${ficheStockData.dateFin}`}
            </h5>
            <button className="btn btn-success" onClick={imprimerFicheStockPDF}>
              🖨️ Imprimer PDF
            </button>
          </div>

          <table className="table table-bordered table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>Code</th>
                <th>Designation</th>
                <th>Unite</th>
                <th className="text-center text-info">Stock Initial</th>
                <th className="text-center text-success">Total Entrees</th>
                <th className="text-center text-danger">Total Sorties</th>
                <th className="text-center text-primary fw-bold">Stock Disponible</th>
              </tr>
            </thead>
            <tbody>
              {ficheStockData.lignes.map((l, i) => (
                <tr key={i} className={Number(l.stock_disponible) <= 0 ? "table-danger" : Number(l.stock_disponible) <= Number(l.stock_minimum) ? "table-warning" : ""}>
                  <td>{l.code_produit}</td>
                  <td>{l.designation}</td>
                  <td>{l.unite}</td>
                  <td className="text-center">{Number(l.stock_initial).toFixed(2)}</td>
                  <td className="text-center text-success fw-bold">+{Number(l.total_entrees).toFixed(2)}</td>
                  <td className="text-center text-danger fw-bold">-{Number(l.total_sorties).toFixed(2)}</td>
                  <td className={`text-center fw-bold ${Number(l.stock_disponible) <= 0 ? "text-danger" : "text-primary"}`}>
                    {Number(l.stock_disponible).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="table-dark fw-bold">
              <tr>
                <td colSpan="3" className="text-end">TOTAUX :</td>
                <td className="text-center">{ficheStockData.lignes.reduce((s, l) => s + Number(l.stock_initial), 0).toFixed(2)}</td>
                <td className="text-center text-success">+{ficheStockData.lignes.reduce((s, l) => s + Number(l.total_entrees), 0).toFixed(2)}</td>
                <td className="text-center text-danger">-{ficheStockData.lignes.reduce((s, l) => s + Number(l.total_sorties), 0).toFixed(2)}</td>
                <td className="text-center text-warning">{ficheStockData.lignes.reduce((s, l) => s + Number(l.stock_disponible), 0).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );

  const renderMouvements = () => (
    <div>
      <h4 className="mb-4">📋 Fiche de Mouvements</h4>
      <div className="card p-3 mb-4">
        <div className="row g-2 align-items-end">
          <div className="col-md-6">
            <label className="form-label fw-bold">Choisir un Produit</label>
            <select className="form-select" value={produitSelectionne}
              onChange={(e) => { setProduitSelectionne(e.target.value); setFicheMouvements(null); }}>
              <option value="">-- Selectionner un produit --</option>
              {produits.map((p) => (<option key={p.id_produit} value={p.id_produit}>{p.code_produit} — {p.designation}</option>))}
            </select>
          </div>
          <div className="col-md-3">
            <button className="btn btn-primary w-100" onClick={chargerMouvements} disabled={!produitSelectionne}>
              🔍 Afficher les Mouvements
            </button>
          </div>
        </div>
      </div>
      {loadingMouvements && (<div className="text-center my-4"><div className="spinner-border text-primary"></div><p className="mt-2">Chargement...</p></div>)}
      {ficheMouvements && !loadingMouvements && (() => {
        const tableauLignes = construireTableauMouvements();
        const { produit, totaux } = ficheMouvements;
        return (
          <div className="card p-4">
            <div className="row mb-3 p-3 bg-primary text-white rounded">
              <div className="col-md-3"><strong>Code :</strong> {produit.code_produit}</div>
              <div className="col-md-3"><strong>Designation :</strong> {produit.designation}</div>
              <div className="col-md-2"><strong>Unite :</strong> {produit.unite}</div>
              <div className="col-md-2"><strong>Prix Achat :</strong> {produit.prix_achat} MRU</div>
              <div className="col-md-2"><strong>Prix Vente :</strong> {produit.prix_vente} MRU</div>
            </div>
            <table className="table table-bordered table-hover">
              <thead className="table-dark">
                <tr><th>Date</th><th>N° Bon</th><th>Type</th><th>Fournisseur / Client</th><th className="text-center">Entree</th><th className="text-center">Sortie</th><th className="text-center">Stock</th></tr>
              </thead>
              <tbody>
                {tableauLignes.map((ligne, i) => (
                  <tr key={i} className={ligne._classe}>
                    <td>{ligne.date}</td><td>{ligne.numero_bon}</td>
                    <td>
                      {ligne.type === "Stock Initial" && <span className="badge bg-info text-dark">📦 Stock Initial</span>}
                      {ligne.type === "Entree" && <span className="badge bg-success">⬆️ Entree</span>}
                      {ligne.type === "Sortie" && <span className="badge bg-danger">⬇️ Sortie</span>}
                    </td>
                    <td>{ligne.tiers}</td>
                    <td className="text-center fw-bold text-success">{ligne.entree !== "-" ? ligne.entree : ""}</td>
                    <td className="text-center fw-bold text-danger">{ligne.sortie !== "-" ? ligne.sortie : ""}</td>
                    <td className="text-center fw-bold text-primary">{ligne.stock}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="table-dark fw-bold">
                <tr>
                  <td colSpan="4" className="text-end">TOTAUX :</td>
                  <td className="text-center text-success">{totaux.total_entrees}</td>
                  <td className="text-center text-danger">{totaux.total_sorties}</td>
                  <td className="text-center text-warning">{totaux.stock_final}</td>
                </tr>
              </tfoot>
            </table>
            <div className="row mt-3">
              <div className="col-md-3"><div className="card text-white bg-info text-center p-2"><small>Stock Initial</small><h4>{totaux.qte_initiale}</h4></div></div>
              <div className="col-md-3"><div className="card text-white bg-success text-center p-2"><small>Total Entrees</small><h4>+{totaux.total_entrees}</h4></div></div>
              <div className="col-md-3"><div className="card text-white bg-danger text-center p-2"><small>Total Sorties</small><h4>-{totaux.total_sorties}</h4></div></div>
              <div className="col-md-3"><div className="card text-white bg-primary text-center p-2"><small>Stock Final</small><h4>{totaux.stock_final}</h4></div></div>
            </div>
          </div>
        );
      })()}
    </div>
  );

  const renderGraphiques = () => (
    <div>
      <h4 className="mb-4">📊 Graphiques du Stock</h4>
      <div className="card mb-4 p-3">
        <h5 className="mb-3 text-primary">📦 Stock Actuel par Produit</h5>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={dataStockActuel} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 12 }} />
            <YAxis /><Tooltip formatter={(v, n) => [v, n]} labelFormatter={(l) => { const i = dataStockActuel.find((d) => d.name === l); return i ? i.designation : l; }} />
            <Legend verticalAlign="top" />
            <Bar dataKey="Stock Actuel" fill="#0d6efd" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Stock Minimum" fill="#ffc107" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="card mb-4 p-3">
        <h5 className="mb-3 text-success">📈 Entrees vs Sorties par Produit</h5>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={dataEntreesSorties} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 12 }} />
            <YAxis /><Tooltip formatter={(v, n) => [v, n]} labelFormatter={(l) => { const i = dataEntreesSorties.find((d) => d.name === l); return i ? i.designation : l; }} />
            <Legend verticalAlign="top" />
            <Bar dataKey="Entrees" fill="#198754" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Sorties" fill="#dc3545" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const colonnes = {
    stock: ["code_produit", "designation", "unite", "total_entree", "total_sortie", "stock_actuel"],
    produits: ["code_produit", "designation", "unite", "prix_achat", "prix_vente", "stock_minimum"],
    clients: ["code_client", "nom", "telephone", "adresse"],
    fournisseurs: ["code_fournisseur", "nom", "telephone", "adresse"],
    "liste-entree": ["numero_bon", "date_bon", "nom_fournisseur", "observation"],
    "liste-sortie": ["numero_bon", "date_bon", "nom_client", "observation"],
  };
  const idCols = { produits: "id_produit", clients: "id_client", fournisseurs: "id_fournisseur" };
  const titres = {
    stock: "Stock Actuel", produits: "Produits", clients: "Clients", fournisseurs: "Fournisseurs",
    "bon-entree": "Nouveau Bon d'Entree", "bon-sortie": "Nouveau Bon de Sortie",
    "liste-entree": "Liste des Bons d'Entree", "liste-sortie": "Liste des Bons de Sortie",
    "graphiques": "Graphiques", "mouvements": "Fiche Mouvements", "fiche-stock": "Fiche de Stock",
  };

  const donneesFiltrees = donnees.filter((d) => Object.values(d).some((v) => String(v).toLowerCase().includes(recherche.toLowerCase())));

  const renderFormAjout = () => {
    if (page === "produits") return (
      <div className="card p-3 mb-3"><h5 className="mb-3">Nouveau Produit</h5>
        <div className="row g-2">
          <div className="col-md-2"><input className="form-control" placeholder="Code *" value={newProduit.code_produit} onChange={(e) => setNewProduit({ ...newProduit, code_produit: e.target.value })} /></div>
          <div className="col-md-3"><input className="form-control" placeholder="Designation *" value={newProduit.designation} onChange={(e) => setNewProduit({ ...newProduit, designation: e.target.value })} /></div>
          <div className="col-md-1"><input className="form-control" placeholder="Unite" value={newProduit.unite} onChange={(e) => setNewProduit({ ...newProduit, unite: e.target.value })} /></div>
          <div className="col-md-2"><input className="form-control" type="number" placeholder="Prix Achat" value={newProduit.prix_achat} onChange={(e) => setNewProduit({ ...newProduit, prix_achat: e.target.value })} /></div>
          <div className="col-md-2"><input className="form-control" type="number" placeholder="Prix Vente" value={newProduit.prix_vente} onChange={(e) => setNewProduit({ ...newProduit, prix_vente: e.target.value })} /></div>
          <div className="col-md-2"><input className="form-control" type="number" placeholder="Stock Min" value={newProduit.stock_minimum} onChange={(e) => setNewProduit({ ...newProduit, stock_minimum: e.target.value })} /></div>
        </div>
        <div className="mt-2"><button className="btn btn-success me-2" onClick={ajouterElement}>Enregistrer</button><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Annuler</button></div>
      </div>
    );
    if (page === "clients") return (
      <div className="card p-3 mb-3"><h5 className="mb-3">Nouveau Client</h5>
        <div className="row g-2">
          <div className="col-md-2"><input className="form-control" placeholder="Code *" value={newClient.code_client} onChange={(e) => setNewClient({ ...newClient, code_client: e.target.value })} /></div>
          <div className="col-md-3"><input className="form-control" placeholder="Nom *" value={newClient.nom} onChange={(e) => setNewClient({ ...newClient, nom: e.target.value })} /></div>
          <div className="col-md-3"><input className="form-control" placeholder="Telephone" value={newClient.telephone} onChange={(e) => setNewClient({ ...newClient, telephone: e.target.value })} /></div>
          <div className="col-md-4"><input className="form-control" placeholder="Adresse" value={newClient.adresse} onChange={(e) => setNewClient({ ...newClient, adresse: e.target.value })} /></div>
        </div>
        <div className="mt-2"><button className="btn btn-success me-2" onClick={ajouterElement}>Enregistrer</button><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Annuler</button></div>
      </div>
    );
    if (page === "fournisseurs") return (
      <div className="card p-3 mb-3"><h5 className="mb-3">Nouveau Fournisseur</h5>
        <div className="row g-2">
          <div className="col-md-2"><input className="form-control" placeholder="Code *" value={newFournisseur.code_fournisseur} onChange={(e) => setNewFournisseur({ ...newFournisseur, code_fournisseur: e.target.value })} /></div>
          <div className="col-md-3"><input className="form-control" placeholder="Nom *" value={newFournisseur.nom} onChange={(e) => setNewFournisseur({ ...newFournisseur, nom: e.target.value })} /></div>
          <div className="col-md-3"><input className="form-control" placeholder="Telephone" value={newFournisseur.telephone} onChange={(e) => setNewFournisseur({ ...newFournisseur, telephone: e.target.value })} /></div>
          <div className="col-md-4"><input className="form-control" placeholder="Adresse" value={newFournisseur.adresse} onChange={(e) => setNewFournisseur({ ...newFournisseur, adresse: e.target.value })} /></div>
        </div>
        <div className="mt-2"><button className="btn btn-success me-2" onClick={ajouterElement}>Enregistrer</button><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Annuler</button></div>
      </div>
    );
  };

  const renderFormulaireBon = (type) => (
    <div className="card p-4">
      <h4 className="mb-4">{type === "bon-entree" ? "Nouveau Bon d'Entree" : "Nouveau Bon de Sortie"}</h4>
      {message && <div className={`alert ${message.includes("succes") ? "alert-success" : "alert-danger"}`}>{message}</div>}
      <div className="row mb-3">
        <div className="col-md-4"><label className="form-label">Numero Bon *</label><input type="text" className="form-control" value={bon.numero_bon} onChange={(e) => setBon({ ...bon, numero_bon: e.target.value })} /></div>
        <div className="col-md-4"><label className="form-label">Date *</label><input type="date" className="form-control" value={bon.date_bon} onChange={(e) => setBon({ ...bon, date_bon: e.target.value })} /></div>
        <div className="col-md-4">
          {type === "bon-entree" ? (<><label className="form-label">Fournisseur *</label><select className="form-select" value={bon.id_fournisseur} onChange={(e) => setBon({ ...bon, id_fournisseur: e.target.value })}><option value="">-- Choisir --</option>{fournisseurs.map((f) => <option key={f.id_fournisseur} value={f.id_fournisseur}>{f.nom}</option>)}</select></>) : (<><label className="form-label">Client *</label><select className="form-select" value={bon.id_client} onChange={(e) => setBon({ ...bon, id_client: e.target.value })}><option value="">-- Choisir --</option>{clients.map((c) => <option key={c.id_client} value={c.id_client}>{c.nom}</option>)}</select></>)}
        </div>
      </div>
      <div className="mb-3"><label className="form-label">Observation</label><input type="text" className="form-control" value={bon.observation} onChange={(e) => setBon({ ...bon, observation: e.target.value })} /></div>
      <h5 className="mb-3">Produits</h5>
      <table className="table table-bordered"><thead className="table-dark"><tr><th>Produit</th><th>Quantite</th><th>Prix Unitaire</th><th>Montant</th><th></th></tr></thead>
        <tbody>{lignes.map((ligne, index) => (<tr key={index}><td><select className="form-select" value={ligne.id_produit} onChange={(e) => modifierLigne(index, "id_produit", e.target.value)}><option value="">-- Choisir --</option>{produits.map((p) => <option key={p.id_produit} value={p.id_produit}>{p.designation}</option>)}</select></td><td><input type="number" className="form-control" value={ligne.quantite} onChange={(e) => modifierLigne(index, "quantite", e.target.value)} /></td><td><input type="number" className="form-control" value={ligne.prix_unitaire} onChange={(e) => modifierLigne(index, "prix_unitaire", e.target.value)} /></td><td className="text-center align-middle">{(ligne.quantite * ligne.prix_unitaire) || 0} MRU</td><td className="text-center align-middle"><button className="btn btn-danger btn-sm" onClick={() => supprimerLigne(index)}>X</button></td></tr>))}</tbody>
      </table>
      <button className="btn btn-secondary mb-3" onClick={ajouterLigne}>+ Ajouter une ligne</button>
      <div><button className="btn btn-success btn-lg" onClick={() => soumettreBon(type)}>Enregistrer le Bon</button></div>
    </div>
  );

  const renderFormulaireModificationBon = () => {
    if (!bonEnEdition) return null;
    const type = bonEnEdition._type;
    return (
      <div className="card p-4 border-warning">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="text-warning">✏️ Modifier le Bon : {bonEnEdition.numero_bon}</h4>
          <button className="btn btn-secondary" onClick={() => { setShowEditBon(false); setBonEnEdition(null); }}>Annuler</button>
        </div>
        {message && <div className={`alert ${message.includes("succes") ? "alert-success" : "alert-danger"}`}>{message}</div>}
        <div className="row mb-3">
          <div className="col-md-4"><label className="form-label">Numero Bon *</label><input type="text" className="form-control" value={bonEnEdition.numero_bon} onChange={(e) => setBonEnEdition({ ...bonEnEdition, numero_bon: e.target.value })} /></div>
          <div className="col-md-4"><label className="form-label">Date *</label><input type="date" className="form-control" value={bonEnEdition.date_bon?.substring(0, 10)} onChange={(e) => setBonEnEdition({ ...bonEnEdition, date_bon: e.target.value })} /></div>
          <div className="col-md-4">
            {type === "entree" ? (<><label className="form-label">Fournisseur *</label><select className="form-select" value={bonEnEdition.id_fournisseur} onChange={(e) => setBonEnEdition({ ...bonEnEdition, id_fournisseur: e.target.value })}><option value="">-- Choisir --</option>{fournisseurs.map((f) => <option key={f.id_fournisseur} value={f.id_fournisseur}>{f.nom}</option>)}</select></>) : (<><label className="form-label">Client *</label><select className="form-select" value={bonEnEdition.id_client} onChange={(e) => setBonEnEdition({ ...bonEnEdition, id_client: e.target.value })}><option value="">-- Choisir --</option>{clients.map((c) => <option key={c.id_client} value={c.id_client}>{c.nom}</option>)}</select></>)}
          </div>
        </div>
        <div className="mb-3"><label className="form-label">Observation</label><input type="text" className="form-control" value={bonEnEdition.observation || ""} onChange={(e) => setBonEnEdition({ ...bonEnEdition, observation: e.target.value })} /></div>
        <h5 className="mb-3">Produits</h5>
        <table className="table table-bordered"><thead className="table-warning"><tr><th>Produit</th><th>Quantite</th><th>Prix Unitaire</th><th>Montant</th><th></th></tr></thead>
          <tbody>{lignesEdition.map((ligne, index) => (<tr key={index}><td><select className="form-select" value={ligne.id_produit} onChange={(e) => modifierLigneEdition(index, "id_produit", e.target.value)}><option value="">-- Choisir --</option>{produits.map((p) => <option key={p.id_produit} value={p.id_produit}>{p.designation}</option>)}</select></td><td><input type="number" className="form-control" value={ligne.quantite} onChange={(e) => modifierLigneEdition(index, "quantite", e.target.value)} /></td><td><input type="number" className="form-control" value={ligne.prix_unitaire} onChange={(e) => modifierLigneEdition(index, "prix_unitaire", e.target.value)} /></td><td className="text-center align-middle">{(ligne.quantite * ligne.prix_unitaire) || 0} MRU</td><td className="text-center align-middle"><button className="btn btn-danger btn-sm" onClick={() => supprimerLigneEdition(index)}>X</button></td></tr>))}</tbody>
        </table>
        <button className="btn btn-secondary mb-3" onClick={ajouterLigneEdition}>+ Ajouter une ligne</button>
        <div><button className="btn btn-warning btn-lg" onClick={enregistrerModificationBon}>💾 Enregistrer les modifications</button></div>
      </div>
    );
  };

  const renderListeBons = (type) => (
    <>
      {showEditBon && bonEnEdition && bonEnEdition._type === type ? renderFormulaireModificationBon()
      : bonDetail ? (
        <div className="card p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5>Detail du Bon : {bonDetail.numero_bon}</h5>
            <div>
              <button className="btn btn-success me-2" onClick={() => imprimerBonPDF(type)}>🖨️ Imprimer PDF</button>
              <button className="btn btn-warning me-2" onClick={() => ouvrirModificationBon(bonDetail, type)}>✏️ Modifier</button>
              <button className="btn btn-danger me-2" onClick={() => supprimerBon(type === "entree" ? bonDetail.id_bon_entree : bonDetail.id_bon_sortie, type)}>🗑️ Supprimer</button>
              <button className="btn btn-secondary" onClick={() => setBonDetail(null)}>Retour</button>
            </div>
          </div>
          <div className="row mb-3">
            <div className="col-md-3"><strong>Numero :</strong> {bonDetail.numero_bon}</div>
            <div className="col-md-3"><strong>Date :</strong> {bonDetail.date_bon?.substring(0, 10)}</div>
            <div className="col-md-3"><strong>{type === "entree" ? "Fournisseur" : "Client"} :</strong> {type === "entree" ? bonDetail.nom_fournisseur : bonDetail.nom_client}</div>
            <div className="col-md-3"><strong>Observation :</strong> {bonDetail.observation}</div>
          </div>
          <table className="table table-bordered table-striped"><thead className="table-dark"><tr><th>Code</th><th>Designation</th><th>Quantite</th><th>Prix Unitaire</th><th>Montant</th></tr></thead>
            <tbody>{lignesDetail.map((l, i) => (<tr key={i}><td>{l.code_produit}</td><td>{l.designation}</td><td>{l.quantite}</td><td>{l.prix_unitaire}</td><td>{l.montant} MRU</td></tr>))}</tbody>
            <tfoot className="table-secondary fw-bold"><tr><td colSpan="4" className="text-end">TOTAL GENERAL :</td><td>{lignesDetail.reduce((sum, l) => sum + Number(l.montant || 0), 0).toLocaleString("fr-FR")} MRU</td></tr></tfoot>
          </table>
        </div>
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3"><h4>{titres[page]}</h4></div>
          {message && (<div className={`alert ${message.includes("succes") ? "alert-success" : "alert-danger"} alert-dismissible`}>{message}<button className="btn-close" onClick={() => setMessage("")}></button></div>)}
          <input type="text" className="form-control mb-3" placeholder="Rechercher..." value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          {loading ? (<div className="text-center"><div className="spinner-border text-primary"></div></div>) : (
            <table className="table table-bordered table-striped table-hover">
              <thead className="table-dark"><tr>{colonnes[page].map((col) => <th key={col}>{col.replace(/_/g, " ").toUpperCase()}</th>)}<th>ACTIONS</th></tr></thead>
              <tbody>{donneesFiltrees.map((d, i) => (<tr key={i}>{colonnes[page].map((col) => <td key={col}>{col.includes("date") ? d[col]?.substring(0, 10) : d[col]}</td>)}<td className="text-center"><button className="btn btn-primary btn-sm me-2" onClick={() => voirDetailBon(d, type)}>Detail</button><button className="btn btn-warning btn-sm me-2" onClick={() => ouvrirModificationBon(d, type)}>✏️ Modifier</button><button className="btn btn-danger btn-sm" onClick={() => supprimerBon(type === "entree" ? d.id_bon_entree : d.id_bon_sortie, type)}>🗑️ Supprimer</button></td></tr>))}</tbody>
            </table>
          )}
        </>
      )}
    </>
  );

  return (
    <div>
      <nav className="navbar navbar-dark bg-primary px-4 mb-4">
        <span className="navbar-brand fw-bold fs-4">📦 Gestion de Stock</span>
      </nav>

      {totalAlertes > 0 && (
        <div className="alert alert-danger mx-3 mb-0 d-flex justify-content-between align-items-center" style={{ borderRadius: 0, cursor: "pointer" }} onClick={() => setShowAlertes(!showAlertes)}>
          <span>🚨 <strong>{totalAlertes} alerte(s) de stock :</strong>
            {produitsRuptureTotale.length > 0 && <span className="badge bg-danger ms-2">{produitsRuptureTotale.length} rupture(s) totale(s)</span>}
            {produitsStockFaible.length > 0 && <span className="badge bg-warning text-dark ms-2">{produitsStockFaible.length} stock(s) faible(s)</span>}
          </span>
          <span>{showAlertes ? "▲ Masquer" : "▼ Voir details"}</span>
        </div>
      )}

      {showAlertes && totalAlertes > 0 && (
        <div className="mx-3 border border-danger border-top-0 p-3 bg-light mb-2">
          {produitsRuptureTotale.length > 0 && (<><h6 className="text-danger">🔴 Rupture Totale (Stock = 0)</h6><table className="table table-sm table-bordered mb-3"><thead className="table-danger"><tr><th>Code</th><th>Designation</th><th>Unite</th><th>Stock Actuel</th></tr></thead><tbody>{produitsRuptureTotale.map((s, i) => (<tr key={i}><td>{s.code_produit}</td><td>{s.designation}</td><td>{s.unite}</td><td className="text-danger fw-bold">{s.stock_actuel}</td></tr>))}</tbody></table></>)}
          {produitsStockFaible.length > 0 && (<><h6 className="text-warning">🟠 Stock Faible (Stock &lt;= Minimum)</h6><table className="table table-sm table-bordered"><thead className="table-warning"><tr><th>Code</th><th>Designation</th><th>Unite</th><th>Stock Actuel</th><th>Stock Minimum</th></tr></thead><tbody>{produitsStockFaible.map((s, i) => (<tr key={i}><td>{s.code_produit}</td><td>{s.designation}</td><td>{s.unite}</td><td className="text-warning fw-bold">{s.stock_actuel}</td><td>{s.stock_minimum}</td></tr>))}</tbody></table></>)}
        </div>
      )}

      <div className="container mt-3">
        <div className="row mb-4">
          <div className="col-md-3"><div className="card text-white bg-primary mb-3"><div className="card-body text-center"><h2>{stats.produits}</h2><p className="mb-0">Produits</p></div></div></div>
          <div className="col-md-3"><div className="card text-white bg-success mb-3"><div className="card-body text-center"><h2>{stats.clients}</h2><p className="mb-0">Clients</p></div></div></div>
          <div className="col-md-3"><div className="card text-white bg-info mb-3"><div className="card-body text-center"><h2>{stats.fournisseurs}</h2><p className="mb-0">Fournisseurs</p></div></div></div>
          <div className="col-md-3"><div className="card text-white bg-danger mb-3"><div className="card-body text-center"><h2>{stats.rupture}</h2><p className="mb-0">Rupture Stock</p></div></div></div>
        </div>

        {totalAlertes > 0 && (
          <div className="card border-danger mb-4">
            <div className="card-header bg-danger text-white fw-bold">🚨 Alertes Stock — {totalAlertes} produit(s) necessitent votre attention</div>
            <div className="card-body p-0">
              <table className="table table-sm table-bordered mb-0"><thead className="table-dark"><tr><th>Code</th><th>Designation</th><th>Stock Actuel</th><th>Stock Minimum</th><th>Statut</th></tr></thead>
                <tbody>
                  {produitsRuptureTotale.map((s, i) => (<tr key={"r" + i} className="table-danger"><td>{s.code_produit}</td><td>{s.designation}</td><td className="fw-bold text-danger">{s.stock_actuel}</td><td>{s.stock_minimum || "-"}</td><td><span className="badge bg-danger">🔴 Rupture Totale</span></td></tr>))}
                  {produitsStockFaible.map((s, i) => (<tr key={"f" + i} className="table-warning"><td>{s.code_produit}</td><td>{s.designation}</td><td className="fw-bold text-warning">{s.stock_actuel}</td><td>{s.stock_minimum}</td><td><span className="badge bg-warning text-dark">🟠 Stock Faible</span></td></tr>))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {stockData.length > 0 && (
          <div className="card mb-4 p-3">
            <h5 className="mb-3 text-primary">📊 Apercu Stock Actuel</h5>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dataStockActuel} margin={{ top: 5, right: 20, left: 0, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
                <YAxis /><Tooltip labelFormatter={(l) => { const i = dataStockActuel.find((d) => d.name === l); return i ? i.designation : l; }} />
                <Legend verticalAlign="top" />
                <Bar dataKey="Stock Actuel" fill="#0d6efd" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Stock Minimum" fill="#ffc107" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mb-4">
          {Object.keys(titres).map((p) => (
            <button key={p} onClick={() => { setPage(p); resetBon(); setBonDetail(null); setShowEditBon(false); setFicheMouvements(null); setProduitSelectionne(""); setFicheStockData(null); }}
              className={`btn me-2 mb-2 ${page === p ? "btn-primary" : "btn-secondary"}`}>
              {p === "graphiques" ? "📊 " : p === "mouvements" ? "📋 " : p === "fiche-stock" ? "📊 " : ""}{titres[p]}
            </button>
          ))}
        </div>

        {page === "graphiques" ? renderGraphiques()
          : page === "mouvements" ? renderMouvements()
          : page === "fiche-stock" ? renderFicheStock()
          : page === "bon-entree" ? renderFormulaireBon("bon-entree")
          : page === "bon-sortie" ? renderFormulaireBon("bon-sortie")
          : page === "liste-entree" ? renderListeBons("entree")
          : page === "liste-sortie" ? renderListeBons("sortie")
          : (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4>{titres[page]}</h4>
                {["produits", "clients", "fournisseurs"].includes(page) && (<button className="btn btn-success" onClick={() => setShowForm(!showForm)}>{showForm ? "Annuler" : "+ Ajouter"}</button>)}
              </div>
              {message && (<div className={`alert ${message.includes("succes") ? "alert-success" : "alert-danger"} alert-dismissible`}>{message}<button className="btn-close" onClick={() => setMessage("")}></button></div>)}
              {showForm && renderFormAjout()}
              <input type="text" className="form-control mb-3" placeholder="Rechercher..." value={recherche} onChange={(e) => setRecherche(e.target.value)} />
              {loading ? (<div className="text-center"><div className="spinner-border text-primary"></div></div>) : (
                <table className="table table-bordered table-striped table-hover">
                  <thead className="table-dark"><tr>{colonnes[page] && colonnes[page].map((col) => (<th key={col}>{col.replace(/_/g, " ").toUpperCase()}</th>))}{["produits", "clients", "fournisseurs"].includes(page) && <th>ACTIONS</th>}</tr></thead>
                  <tbody>{donneesFiltrees.map((d, i) => (<tr key={i}>{colonnes[page] && colonnes[page].map((col) => (<td key={col}>{d[col]}</td>))}{["produits", "clients", "fournisseurs"].includes(page) && (<td className="text-center"><button className="btn btn-warning btn-sm me-2" onClick={() => ouvrirModification(d)}>✏️ Modifier</button><button className="btn btn-danger btn-sm" onClick={() => supprimerElement(d[idCols[page]])}>🗑️ Supprimer</button></td>)}</tr>))}</tbody>
                </table>
              )}
            </>
          )}
      </div>

      {showEditModal && elementAModifier && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-warning">
                <h5 className="modal-title">✏️ Modifier {page === "produits" ? "Produit" : page === "clients" ? "Client" : "Fournisseur"}</h5>
                <button className="btn-close" onClick={() => setShowEditModal(false)}></button>
              </div>
              <div className="modal-body">
                {page === "produits" && (<div className="row g-3">
                  <div className="col-md-2"><label className="form-label">Code</label><input className="form-control" value={elementAModifier.code_produit || ""} onChange={(e) => setElementAModifier({ ...elementAModifier, code_produit: e.target.value })} /></div>
                  <div className="col-md-4"><label className="form-label">Designation</label><input className="form-control" value={elementAModifier.designation || ""} onChange={(e) => setElementAModifier({ ...elementAModifier, designation: e.target.value })} /></div>
                  <div className="col-md-2"><label className="form-label">Unite</label><input className="form-control" value={elementAModifier.unite || ""} onChange={(e) => setElementAModifier({ ...elementAModifier, unite: e.target.value })} /></div>
                  <div className="col-md-2"><label className="form-label">Prix Achat</label><input type="number" className="form-control" value={elementAModifier.prix_achat || ""} onChange={(e) => setElementAModifier({ ...elementAModifier, prix_achat: e.target.value })} /></div>
                  <div className="col-md-2"><label className="form-label">Prix Vente</label><input type="number" className="form-control" value={elementAModifier.prix_vente || ""} onChange={(e) => setElementAModifier({ ...elementAModifier, prix_vente: e.target.value })} /></div>
                  <div className="col-md-2"><label className="form-label">Stock Minimum</label><input type="number" className="form-control" value={elementAModifier.stock_minimum || ""} onChange={(e) => setElementAModifier({ ...elementAModifier, stock_minimum: e.target.value })} /></div>
                </div>)}
                {(page === "clients" || page === "fournisseurs") && (<div className="row g-3">
                  <div className="col-md-3"><label className="form-label">Code</label><input className="form-control" value={elementAModifier[page === "clients" ? "code_client" : "code_fournisseur"] || ""} onChange={(e) => setElementAModifier({ ...elementAModifier, [page === "clients" ? "code_client" : "code_fournisseur"]: e.target.value })} /></div>
                  <div className="col-md-3"><label className="form-label">Nom</label><input className="form-control" value={elementAModifier.nom || ""} onChange={(e) => setElementAModifier({ ...elementAModifier, nom: e.target.value })} /></div>
                  <div className="col-md-3"><label className="form-label">Telephone</label><input className="form-control" value={elementAModifier.telephone || ""} onChange={(e) => setElementAModifier({ ...elementAModifier, telephone: e.target.value })} /></div>
                  <div className="col-md-3"><label className="form-label">Adresse</label><input className="form-control" value={elementAModifier.adresse || ""} onChange={(e) => setElementAModifier({ ...elementAModifier, adresse: e.target.value })} /></div>
                </div>)}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Annuler</button>
                <button className="btn btn-warning" onClick={enregistrerModification}>💾 Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;