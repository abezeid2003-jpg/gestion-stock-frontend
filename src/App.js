import { useState, useEffect } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

  // ETATS MODIFICATION PRODUITS/CLIENTS/FOURNISSEURS
  const [showEditModal, setShowEditModal] = useState(false);
  const [elementAModifier, setElementAModifier] = useState(null);

  // ETATS MODIFICATION BONS
  const [bonEnEdition, setBonEnEdition] = useState(null);
  const [lignesEdition, setLignesEdition] = useState([]);
  const [showEditBon, setShowEditBon] = useState(false);

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
    });
  };

  useEffect(() => { chargerStats(); }, []);

  useEffect(() => {
    if (["bon-entree", "bon-sortie"].includes(page)) return;
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

  const resetBon = () => {
    setBon({ numero_bon: "", date_bon: "", id_fournisseur: "", id_client: "", observation: "" });
    setLignes([{ id_produit: "", quantite: "", prix_unitaire: "" }]);
    setMessage("");
  };

  const ajouterLigne = () => setLignes([...lignes, { id_produit: "", quantite: "", prix_unitaire: "" }]);
  const supprimerLigne = (index) => setLignes(lignes.filter((_, i) => i !== index));
  const modifierLigne = (index, champ, valeur) => {
    const newLignes = [...lignes];
    newLignes[index][champ] = valeur;
    setLignes(newLignes);
  };

  const ajouterLigneEdition = () => setLignesEdition([...lignesEdition, { id_produit: "", quantite: "", prix_unitaire: "" }]);
  const supprimerLigneEdition = (index) => setLignesEdition(lignesEdition.filter((_, i) => i !== index));
  const modifierLigneEdition = (index, champ, valeur) => {
    const newLignes = [...lignesEdition];
    newLignes[index][champ] = valeur;
    setLignesEdition(newLignes);
  };

  const soumettreBon = async (type) => {
    if (!bon.numero_bon || !bon.date_bon) { setMessage("Champs obligatoires manquants !"); return; }
    if (type === "bon-entree" && !bon.id_fournisseur) { setMessage("Choisissez un fournisseur !"); return; }
    if (type === "bon-sortie" && !bon.id_client) { setMessage("Choisissez un client !"); return; }
    const body = type === "bon-entree"
      ? { numero_bon: bon.numero_bon, date_bon: bon.date_bon, id_fournisseur: bon.id_fournisseur, observation: bon.observation, lignes }
      : { numero_bon: bon.numero_bon, date_bon: bon.date_bon, id_client: bon.id_client, observation: bon.observation, lignes };
    try {
      const response = await fetch(`${API}/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.success) {
        setMessage("Bon enregistre avec succes !");
        resetBon();
        chargerStats();
      } else {
        setMessage("Erreur : " + data.error);
      }
    } catch (err) { setMessage("Erreur de connexion !"); }
  };

  const ajouterElement = async () => {
    let url = "", body = {};
    if (page === "produits") { url = `${API}/produits`; body = newProduit; }
    else if (page === "clients") { url = `${API}/clients`; body = newClient; }
    else if (page === "fournisseurs") { url = `${API}/fournisseurs`; body = newFournisseur; }
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.success) {
        setMessage("Ajoute avec succes !");
        setShowForm(false);
        setNewProduit({ code_produit: "", designation: "", unite: "", prix_achat: "", prix_vente: "", stock_minimum: "" });
        setNewClient({ code_client: "", nom: "", telephone: "", adresse: "" });
        setNewFournisseur({ code_fournisseur: "", nom: "", telephone: "", adresse: "" });
        fetch(`${API}/${page}`).then((r) => r.json()).then(setDonnees);
        chargerStats();
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
      if (data.success) {
        setMessage("Supprime avec succes !");
        fetch(`${API}/${page}`).then((r) => r.json()).then(setDonnees);
        chargerStats();
      } else { setMessage("Erreur : " + data.error); }
    } catch (err) { setMessage("Erreur de connexion !"); }
  };

  const ouvrirModification = (element) => {
    setElementAModifier({ ...element });
    setShowEditModal(true);
  };

  const enregistrerModification = async () => {
    let url = "";
    if (page === "produits") url = `${API}/produits/${elementAModifier.id_produit}`;
    else if (page === "clients") url = `${API}/clients/${elementAModifier.id_client}`;
    else if (page === "fournisseurs") url = `${API}/fournisseurs/${elementAModifier.id_fournisseur}`;
    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(elementAModifier),
      });
      const data = await response.json();
      if (data.id_produit || data.id_client || data.id_fournisseur) {
        setMessage("Modifie avec succes !");
        setShowEditModal(false);
        setElementAModifier(null);
        fetch(`${API}/${page}`).then((r) => r.json()).then(setDonnees);
        chargerStats();
      } else {
        setMessage("Erreur lors de la modification !");
      }
    } catch (err) {
      setMessage("Erreur de connexion !");
    }
  };

  const ouvrirModificationBon = async (bonData, type) => {
    setBonEnEdition({ ...bonData, _type: type });
    const url = type === "entree"
      ? `${API}/bons-entree/${bonData.id_bon_entree}/lignes`
      : `${API}/bons-sortie/${bonData.id_bon_sortie}/lignes`;
    const lignesData = await fetch(url).then((r) => r.json());
    setLignesEdition(lignesData.map((l) => ({
      id_produit: l.id_produit,
      quantite: l.quantite,
      prix_unitaire: l.prix_unitaire,
    })));
    setShowEditBon(true);
    setBonDetail(null);
  };

  const enregistrerModificationBon = async () => {
    const type = bonEnEdition._type;
    const id = type === "entree" ? bonEnEdition.id_bon_entree : bonEnEdition.id_bon_sortie;
    const url = type === "entree" ? `${API}/bons-entree/${id}` : `${API}/bons-sortie/${id}`;
    const body = type === "entree"
      ? { numero_bon: bonEnEdition.numero_bon, date_bon: bonEnEdition.date_bon, id_fournisseur: bonEnEdition.id_fournisseur, observation: bonEnEdition.observation, lignes: lignesEdition }
      : { numero_bon: bonEnEdition.numero_bon, date_bon: bonEnEdition.date_bon, id_client: bonEnEdition.id_client, observation: bonEnEdition.observation, lignes: lignesEdition };
    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.success) {
        setMessage("Bon modifie avec succes !");
        setShowEditBon(false);
        setBonEnEdition(null);
        const listeUrl = type === "entree" ? `${API}/bons-entree` : `${API}/bons-sortie`;
        fetch(listeUrl).then((r) => r.json()).then(setDonnees);
        chargerStats();
      } else {
        setMessage("Erreur : " + data.error);
      }
    } catch (err) { setMessage("Erreur de connexion !"); }
  };

  const supprimerBon = async (id, type) => {
    if (!window.confirm("Confirmer la suppression de ce bon ?")) return;
    const url = type === "entree" ? `${API}/bons-entree/${id}` : `${API}/bons-sortie/${id}`;
    try {
      const response = await fetch(url, { method: "DELETE" });
      const data = await response.json();
      if (data.success) {
        setMessage("Bon supprime avec succes !");
        setBonDetail(null);
        const listeUrl = type === "entree" ? `${API}/bons-entree` : `${API}/bons-sortie`;
        fetch(listeUrl).then((r) => r.json()).then(setDonnees);
        chargerStats();
      } else { setMessage("Erreur : " + data.error); }
    } catch (err) { setMessage("Erreur de connexion !"); }
  };

  const voirDetailBon = async (bon, type) => {
    setBonDetail(bon);
    const url = type === "entree"
      ? `${API}/bons-entree/${bon.id_bon_entree}/lignes`
      : `${API}/bons-sortie/${bon.id_bon_sortie}/lignes`;
    const lignes = await fetch(url).then((r) => r.json());
    setLignesDetail(lignes);
  };

  // 🖨️ FONCTION IMPRESSION PDF
  const imprimerBonPDF = (type) => {
    const doc = new jsPDF();
    const estEntree = type === "entree";
    const titre = estEntree ? "BON D'ENTREE" : "BON DE SORTIE";
    const couleur = estEntree ? [13, 110, 253] : [25, 135, 84];

    // En-tete de la societe
    doc.setFillColor(...couleur);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("GESTION DE STOCK", 105, 13, { align: "center" });
    doc.setFontSize(13);
    doc.text(titre, 105, 23, { align: "center" });

    // Informations du bon
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Numero du Bon :", 15, 42);
    doc.text("Date :", 15, 52);
    doc.text(estEntree ? "Fournisseur :" : "Client :", 15, 62);
    doc.text("Observation :", 15, 72);

    doc.setFont("helvetica", "normal");
    doc.text(bonDetail.numero_bon || "-", 60, 42);
    doc.text(bonDetail.date_bon?.substring(0, 10) || "-", 60, 52);
    doc.text(
      estEntree ? (bonDetail.nom_fournisseur || "-") : (bonDetail.nom_client || "-"),
      60, 62
    );
    doc.text(bonDetail.observation || "-", 60, 72);

    // Ligne separatrice
    doc.setDrawColor(...couleur);
    doc.setLineWidth(0.5);
    doc.line(15, 78, 195, 78);

    // Tableau des lignes
    const formatMontant = (val) => Number(val).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    const totalGeneral = lignesDetail.reduce((sum, l) => sum + Number(l.montant || 0), 0);

    autoTable(doc, {
      startY: 83,
      head: [["Code", "Designation", "Quantite", "Prix Unitaire", "Montant (MRU)"]],
      body: lignesDetail.map((l) => [
        l.code_produit || "-",
        l.designation || "-",
        l.quantite,
        formatMontant(l.prix_unitaire),
        formatMontant(l.montant),
      ]),
      foot: [["", "", "", "TOTAL GENERAL :", formatMontant(totalGeneral) + " MRU"]],
      headStyles: { fillColor: couleur, textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [249, 249, 249] },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 70 },
        2: { cellWidth: 25, halign: "center" },
        3: { cellWidth: 35, halign: "right" },
        4: { cellWidth: 35, halign: "right" },
      },
    });

    // Pied de page
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Document genere le ${new Date().toLocaleDateString("fr-FR")} a ${new Date().toLocaleTimeString("fr-FR")}`,
      105, pageHeight - 10, { align: "center" }
    );

    // Telecharger le PDF
    doc.save(`${titre.replace(" ", "_")}_${bonDetail.numero_bon}.pdf`);
  };

  const colonnes = {
    stock: ["code_produit", "designation", "unite", "total_entree", "total_sortie", "stock_actuel"],
    produits: ["code_produit", "designation", "unite", "prix_achat", "prix_vente", "stock_minimum"],
    clients: ["code_client", "nom", "telephone", "adresse"],
    fournisseurs: ["code_fournisseur", "nom", "telephone", "adresse"],
    "liste-entree": ["numero_bon", "date_bon", "nom_fournisseur", "observation"],
    "liste-sortie": ["numero_bon", "date_bon", "nom_client", "observation"],
  };

  const idCols = {
    produits: "id_produit",
    clients: "id_client",
    fournisseurs: "id_fournisseur",
  };

  const titres = {
    stock: "Stock Actuel",
    produits: "Produits",
    clients: "Clients",
    fournisseurs: "Fournisseurs",
    "bon-entree": "Nouveau Bon d'Entree",
    "bon-sortie": "Nouveau Bon de Sortie",
    "liste-entree": "Liste des Bons d'Entree",
    "liste-sortie": "Liste des Bons de Sortie",
  };

  const donneesFiltrees = donnees.filter((d) =>
    Object.values(d).some((v) => String(v).toLowerCase().includes(recherche.toLowerCase()))
  );

  const renderFormAjout = () => {
    if (page === "produits") return (
      <div className="card p-3 mb-3">
        <h5 className="mb-3">Nouveau Produit</h5>
        <div className="row g-2">
          <div className="col-md-2"><input className="form-control" placeholder="Code *" value={newProduit.code_produit} onChange={(e) => setNewProduit({ ...newProduit, code_produit: e.target.value })} /></div>
          <div className="col-md-3"><input className="form-control" placeholder="Designation *" value={newProduit.designation} onChange={(e) => setNewProduit({ ...newProduit, designation: e.target.value })} /></div>
          <div className="col-md-1"><input className="form-control" placeholder="Unite" value={newProduit.unite} onChange={(e) => setNewProduit({ ...newProduit, unite: e.target.value })} /></div>
          <div className="col-md-2"><input className="form-control" type="number" placeholder="Prix Achat" value={newProduit.prix_achat} onChange={(e) => setNewProduit({ ...newProduit, prix_achat: e.target.value })} /></div>
          <div className="col-md-2"><input className="form-control" type="number" placeholder="Prix Vente" value={newProduit.prix_vente} onChange={(e) => setNewProduit({ ...newProduit, prix_vente: e.target.value })} /></div>
          <div className="col-md-2"><input className="form-control" type="number" placeholder="Stock Min" value={newProduit.stock_minimum} onChange={(e) => setNewProduit({ ...newProduit, stock_minimum: e.target.value })} /></div>
        </div>
        <div className="mt-2">
          <button className="btn btn-success me-2" onClick={ajouterElement}>Enregistrer</button>
          <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
        </div>
      </div>
    );
    if (page === "clients") return (
      <div className="card p-3 mb-3">
        <h5 className="mb-3">Nouveau Client</h5>
        <div className="row g-2">
          <div className="col-md-2"><input className="form-control" placeholder="Code *" value={newClient.code_client} onChange={(e) => setNewClient({ ...newClient, code_client: e.target.value })} /></div>
          <div className="col-md-3"><input className="form-control" placeholder="Nom *" value={newClient.nom} onChange={(e) => setNewClient({ ...newClient, nom: e.target.value })} /></div>
          <div className="col-md-3"><input className="form-control" placeholder="Telephone" value={newClient.telephone} onChange={(e) => setNewClient({ ...newClient, telephone: e.target.value })} /></div>
          <div className="col-md-4"><input className="form-control" placeholder="Adresse" value={newClient.adresse} onChange={(e) => setNewClient({ ...newClient, adresse: e.target.value })} /></div>
        </div>
        <div className="mt-2">
          <button className="btn btn-success me-2" onClick={ajouterElement}>Enregistrer</button>
          <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
        </div>
      </div>
    );
    if (page === "fournisseurs") return (
      <div className="card p-3 mb-3">
        <h5 className="mb-3">Nouveau Fournisseur</h5>
        <div className="row g-2">
          <div className="col-md-2"><input className="form-control" placeholder="Code *" value={newFournisseur.code_fournisseur} onChange={(e) => setNewFournisseur({ ...newFournisseur, code_fournisseur: e.target.value })} /></div>
          <div className="col-md-3"><input className="form-control" placeholder="Nom *" value={newFournisseur.nom} onChange={(e) => setNewFournisseur({ ...newFournisseur, nom: e.target.value })} /></div>
          <div className="col-md-3"><input className="form-control" placeholder="Telephone" value={newFournisseur.telephone} onChange={(e) => setNewFournisseur({ ...newFournisseur, telephone: e.target.value })} /></div>
          <div className="col-md-4"><input className="form-control" placeholder="Adresse" value={newFournisseur.adresse} onChange={(e) => setNewFournisseur({ ...newFournisseur, adresse: e.target.value })} /></div>
        </div>
        <div className="mt-2">
          <button className="btn btn-success me-2" onClick={ajouterElement}>Enregistrer</button>
          <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
        </div>
      </div>
    );
  };

  const renderFormulaireBon = (type) => (
    <div className="card p-4">
      <h4 className="mb-4">{type === "bon-entree" ? "Nouveau Bon d'Entree" : "Nouveau Bon de Sortie"}</h4>
      {message && <div className={`alert ${message.includes("succes") ? "alert-success" : "alert-danger"}`}>{message}</div>}
      <div className="row mb-3">
        <div className="col-md-4">
          <label className="form-label">Numero Bon *</label>
          <input type="text" className="form-control" value={bon.numero_bon} onChange={(e) => setBon({ ...bon, numero_bon: e.target.value })} placeholder={type === "bon-entree" ? "Ex: BE003" : "Ex: BS003"} />
        </div>
        <div className="col-md-4">
          <label className="form-label">Date *</label>
          <input type="date" className="form-control" value={bon.date_bon} onChange={(e) => setBon({ ...bon, date_bon: e.target.value })} />
        </div>
        <div className="col-md-4">
          {type === "bon-entree" ? (
            <>
              <label className="form-label">Fournisseur *</label>
              <select className="form-select" value={bon.id_fournisseur} onChange={(e) => setBon({ ...bon, id_fournisseur: e.target.value })}>
                <option value="">-- Choisir --</option>
                {fournisseurs.map((f) => <option key={f.id_fournisseur} value={f.id_fournisseur}>{f.nom}</option>)}
              </select>
            </>
          ) : (
            <>
              <label className="form-label">Client *</label>
              <select className="form-select" value={bon.id_client} onChange={(e) => setBon({ ...bon, id_client: e.target.value })}>
                <option value="">-- Choisir --</option>
                {clients.map((c) => <option key={c.id_client} value={c.id_client}>{c.nom}</option>)}
              </select>
            </>
          )}
        </div>
      </div>
      <div className="mb-3">
        <label className="form-label">Observation</label>
        <input type="text" className="form-control" value={bon.observation} onChange={(e) => setBon({ ...bon, observation: e.target.value })} />
      </div>
      <h5 className="mb-3">Produits</h5>
      <table className="table table-bordered">
        <thead className="table-dark">
          <tr><th>Produit</th><th>Quantite</th><th>Prix Unitaire</th><th>Montant</th><th></th></tr>
        </thead>
        <tbody>
          {lignes.map((ligne, index) => (
            <tr key={index}>
              <td>
                <select className="form-select" value={ligne.id_produit} onChange={(e) => modifierLigne(index, "id_produit", e.target.value)}>
                  <option value="">-- Choisir --</option>
                  {produits.map((p) => <option key={p.id_produit} value={p.id_produit}>{p.designation}</option>)}
                </select>
              </td>
              <td><input type="number" className="form-control" value={ligne.quantite} onChange={(e) => modifierLigne(index, "quantite", e.target.value)} /></td>
              <td><input type="number" className="form-control" value={ligne.prix_unitaire} onChange={(e) => modifierLigne(index, "prix_unitaire", e.target.value)} /></td>
              <td className="text-center align-middle">{(ligne.quantite * ligne.prix_unitaire) || 0} MRU</td>
              <td className="text-center align-middle"><button className="btn btn-danger btn-sm" onClick={() => supprimerLigne(index)}>X</button></td>
            </tr>
          ))}
        </tbody>
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
          <div className="col-md-4">
            <label className="form-label">Numero Bon *</label>
            <input type="text" className="form-control" value={bonEnEdition.numero_bon}
              onChange={(e) => setBonEnEdition({ ...bonEnEdition, numero_bon: e.target.value })} />
          </div>
          <div className="col-md-4">
            <label className="form-label">Date *</label>
            <input type="date" className="form-control" value={bonEnEdition.date_bon?.substring(0, 10)}
              onChange={(e) => setBonEnEdition({ ...bonEnEdition, date_bon: e.target.value })} />
          </div>
          <div className="col-md-4">
            {type === "entree" ? (
              <>
                <label className="form-label">Fournisseur *</label>
                <select className="form-select" value={bonEnEdition.id_fournisseur}
                  onChange={(e) => setBonEnEdition({ ...bonEnEdition, id_fournisseur: e.target.value })}>
                  <option value="">-- Choisir --</option>
                  {fournisseurs.map((f) => <option key={f.id_fournisseur} value={f.id_fournisseur}>{f.nom}</option>)}
                </select>
              </>
            ) : (
              <>
                <label className="form-label">Client *</label>
                <select className="form-select" value={bonEnEdition.id_client}
                  onChange={(e) => setBonEnEdition({ ...bonEnEdition, id_client: e.target.value })}>
                  <option value="">-- Choisir --</option>
                  {clients.map((c) => <option key={c.id_client} value={c.id_client}>{c.nom}</option>)}
                </select>
              </>
            )}
          </div>
        </div>
        <div className="mb-3">
          <label className="form-label">Observation</label>
          <input type="text" className="form-control" value={bonEnEdition.observation || ""}
            onChange={(e) => setBonEnEdition({ ...bonEnEdition, observation: e.target.value })} />
        </div>
        <h5 className="mb-3">Produits</h5>
        <table className="table table-bordered">
          <thead className="table-warning">
            <tr><th>Produit</th><th>Quantite</th><th>Prix Unitaire</th><th>Montant</th><th></th></tr>
          </thead>
          <tbody>
            {lignesEdition.map((ligne, index) => (
              <tr key={index}>
                <td>
                  <select className="form-select" value={ligne.id_produit}
                    onChange={(e) => modifierLigneEdition(index, "id_produit", e.target.value)}>
                    <option value="">-- Choisir --</option>
                    {produits.map((p) => <option key={p.id_produit} value={p.id_produit}>{p.designation}</option>)}
                  </select>
                </td>
                <td><input type="number" className="form-control" value={ligne.quantite}
                  onChange={(e) => modifierLigneEdition(index, "quantite", e.target.value)} /></td>
                <td><input type="number" className="form-control" value={ligne.prix_unitaire}
                  onChange={(e) => modifierLigneEdition(index, "prix_unitaire", e.target.value)} /></td>
                <td className="text-center align-middle">{(ligne.quantite * ligne.prix_unitaire) || 0} MRU</td>
                <td className="text-center align-middle">
                  <button className="btn btn-danger btn-sm" onClick={() => supprimerLigneEdition(index)}>X</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="btn btn-secondary mb-3" onClick={ajouterLigneEdition}>+ Ajouter une ligne</button>
        <div>
          <button className="btn btn-warning btn-lg" onClick={enregistrerModificationBon}>💾 Enregistrer les modifications</button>
        </div>
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
              {/* 🖨️ BOUTON IMPRIMER PDF */}
              <button className="btn btn-success me-2"
                onClick={() => imprimerBonPDF(type)}>
                🖨️ Imprimer PDF
              </button>
              <button className="btn btn-warning me-2"
                onClick={() => ouvrirModificationBon(bonDetail, type)}>
                ✏️ Modifier
              </button>
              <button className="btn btn-danger me-2"
                onClick={() => supprimerBon(
                  type === "entree" ? bonDetail.id_bon_entree : bonDetail.id_bon_sortie, type
                )}>
                🗑️ Supprimer
              </button>
              <button className="btn btn-secondary" onClick={() => setBonDetail(null)}>Retour</button>
            </div>
          </div>
          <div className="row mb-3">
            <div className="col-md-3"><strong>Numero :</strong> {bonDetail.numero_bon}</div>
            <div className="col-md-3"><strong>Date :</strong> {bonDetail.date_bon?.substring(0, 10)}</div>
            <div className="col-md-3"><strong>{type === "entree" ? "Fournisseur" : "Client"} :</strong> {type === "entree" ? bonDetail.nom_fournisseur : bonDetail.nom_client}</div>
            <div className="col-md-3"><strong>Observation :</strong> {bonDetail.observation}</div>
          </div>
          <table className="table table-bordered table-striped">
            <thead className="table-dark">
              <tr><th>Code</th><th>Designation</th><th>Quantite</th><th>Prix Unitaire</th><th>Montant</th></tr>
            </thead>
            <tbody>
              {lignesDetail.map((l, i) => (
                <tr key={i}>
                  <td>{l.code_produit}</td>
                  <td>{l.designation}</td>
                  <td>{l.quantite}</td>
                  <td>{l.prix_unitaire}</td>
                  <td>{l.montant} MRU</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="table-secondary fw-bold">
              <tr>
                <td colSpan="4" className="text-end">TOTAL GENERAL :</td>
                <td>{lignesDetail.reduce((sum, l) => sum + Number(l.montant || 0), 0).toLocaleString("fr-FR")} MRU</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4>{titres[page]}</h4>
          </div>
          {message && (
            <div className={`alert ${message.includes("succes") ? "alert-success" : "alert-danger"} alert-dismissible`}>
              {message}
              <button className="btn-close" onClick={() => setMessage("")}></button>
            </div>
          )}
          <input type="text" className="form-control mb-3" placeholder="Rechercher..."
            value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          {loading ? (
            <div className="text-center"><div className="spinner-border text-primary"></div></div>
          ) : (
            <table className="table table-bordered table-striped table-hover">
              <thead className="table-dark">
                <tr>
                  {colonnes[page].map((col) => <th key={col}>{col.replace(/_/g, " ").toUpperCase()}</th>)}
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {donneesFiltrees.map((d, i) => (
                  <tr key={i}>
                    {colonnes[page].map((col) => <td key={col}>{col.includes("date") ? d[col]?.substring(0, 10) : d[col]}</td>)}
                    <td className="text-center">
                      <button className="btn btn-primary btn-sm me-2"
                        onClick={() => voirDetailBon(d, type)}>
                        Detail
                      </button>
                      <button className="btn btn-warning btn-sm me-2"
                        onClick={() => ouvrirModificationBon(d, type)}>
                        ✏️ Modifier
                      </button>
                      <button className="btn btn-danger btn-sm"
                        onClick={() => supprimerBon(
                          type === "entree" ? d.id_bon_entree : d.id_bon_sortie, type
                        )}>
                        🗑️ Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </>
  );

  return (
    <div>
      <nav className="navbar navbar-dark bg-primary px-4 mb-4">
        <span className="navbar-brand fw-bold fs-4">Gestion de Stock</span>
      </nav>
      <div className="container">
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card text-white bg-primary mb-3">
              <div className="card-body text-center"><h2>{stats.produits}</h2><p className="mb-0">Produits</p></div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-white bg-success mb-3">
              <div className="card-body text-center"><h2>{stats.clients}</h2><p className="mb-0">Clients</p></div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-white bg-info mb-3">
              <div className="card-body text-center"><h2>{stats.fournisseurs}</h2><p className="mb-0">Fournisseurs</p></div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-white bg-danger mb-3">
              <div className="card-body text-center"><h2>{stats.rupture}</h2><p className="mb-0">Rupture Stock</p></div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          {Object.keys(titres).map((p) => (
            <button key={p} onClick={() => { setPage(p); resetBon(); setBonDetail(null); setShowEditBon(false); }}
              className={`btn me-2 mb-2 ${page === p ? "btn-primary" : "btn-secondary"}`}>
              {titres[p]}
            </button>
          ))}
        </div>

        {page === "bon-entree" ? renderFormulaireBon("bon-entree")
          : page === "bon-sortie" ? renderFormulaireBon("bon-sortie")
          : page === "liste-entree" ? renderListeBons("entree")
          : page === "liste-sortie" ? renderListeBons("sortie")
          : (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4>{titres[page]}</h4>
                {["produits", "clients", "fournisseurs"].includes(page) && (
                  <button className="btn btn-success" onClick={() => setShowForm(!showForm)}>
                    {showForm ? "Annuler" : "+ Ajouter"}
                  </button>
                )}
              </div>

              {message && (
                <div className={`alert ${message.includes("succes") ? "alert-success" : "alert-danger"} alert-dismissible`}>
                  {message}
                  <button className="btn-close" onClick={() => setMessage("")}></button>
                </div>
              )}

              {showForm && renderFormAjout()}

              <input type="text" className="form-control mb-3" placeholder="Rechercher..."
                value={recherche} onChange={(e) => setRecherche(e.target.value)} />

              {loading ? (
                <div className="text-center"><div className="spinner-border text-primary"></div></div>
              ) : (
                <table className="table table-bordered table-striped table-hover">
                  <thead className="table-dark">
                    <tr>
                      {colonnes[page] && colonnes[page].map((col) => (
                        <th key={col}>{col.replace(/_/g, " ").toUpperCase()}</th>
                      ))}
                      {["produits", "clients", "fournisseurs"].includes(page) && <th>ACTIONS</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {donneesFiltrees.map((d, i) => (
                      <tr key={i}>
                        {colonnes[page] && colonnes[page].map((col) => (
                          <td key={col}>{d[col]}</td>
                        ))}
                        {["produits", "clients", "fournisseurs"].includes(page) && (
                          <td className="text-center">
                            <button className="btn btn-warning btn-sm me-2"
                              onClick={() => ouvrirModification(d)}>
                              ✏️ Modifier
                            </button>
                            <button className="btn btn-danger btn-sm"
                              onClick={() => supprimerElement(d[idCols[page]])}>
                              🗑️ Supprimer
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
      </div>

      {/* MODAL MODIFICATION PRODUITS/CLIENTS/FOURNISSEURS */}
      {showEditModal && elementAModifier && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-warning">
                <h5 className="modal-title">
                  ✏️ Modifier {page === "produits" ? "Produit" : page === "clients" ? "Client" : "Fournisseur"}
                </h5>
                <button className="btn-close" onClick={() => setShowEditModal(false)}></button>
              </div>
              <div className="modal-body">
                {page === "produits" && (
                  <div className="row g-3">
                    <div className="col-md-2">
                      <label className="form-label">Code</label>
                      <input className="form-control" value={elementAModifier.code_produit || ""}
                        onChange={(e) => setElementAModifier({ ...elementAModifier, code_produit: e.target.value })} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Designation</label>
                      <input className="form-control" value={elementAModifier.designation || ""}
                        onChange={(e) => setElementAModifier({ ...elementAModifier, designation: e.target.value })} />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Unite</label>
                      <input className="form-control" value={elementAModifier.unite || ""}
                        onChange={(e) => setElementAModifier({ ...elementAModifier, unite: e.target.value })} />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Prix Achat</label>
                      <input type="number" className="form-control" value={elementAModifier.prix_achat || ""}
                        onChange={(e) => setElementAModifier({ ...elementAModifier, prix_achat: e.target.value })} />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Prix Vente</label>
                      <input type="number" className="form-control" value={elementAModifier.prix_vente || ""}
                        onChange={(e) => setElementAModifier({ ...elementAModifier, prix_vente: e.target.value })} />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Stock Minimum</label>
                      <input type="number" className="form-control" value={elementAModifier.stock_minimum || ""}
                        onChange={(e) => setElementAModifier({ ...elementAModifier, stock_minimum: e.target.value })} />
                    </div>
                  </div>
                )}
                {(page === "clients" || page === "fournisseurs") && (
                  <div className="row g-3">
                    <div className="col-md-3">
                      <label className="form-label">Code</label>
                      <input className="form-control"
                        value={elementAModifier[page === "clients" ? "code_client" : "code_fournisseur"] || ""}
                        onChange={(e) => setElementAModifier({
                          ...elementAModifier,
                          [page === "clients" ? "code_client" : "code_fournisseur"]: e.target.value
                        })} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Nom</label>
                      <input className="form-control" value={elementAModifier.nom || ""}
                        onChange={(e) => setElementAModifier({ ...elementAModifier, nom: e.target.value })} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Telephone</label>
                      <input className="form-control" value={elementAModifier.telephone || ""}
                        onChange={(e) => setElementAModifier({ ...elementAModifier, telephone: e.target.value })} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Adresse</label>
                      <input className="form-control" value={elementAModifier.adresse || ""}
                        onChange={(e) => setElementAModifier({ ...elementAModifier, adresse: e.target.value })} />
                    </div>
                  </div>
                )}
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