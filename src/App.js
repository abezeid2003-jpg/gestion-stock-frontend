import { useState, useEffect } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

function App() {
  const API = "https://gestion-stock-backend-5qm3.onrender.com"; // v2

  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [utilisateur, setUtilisateur] = useState(JSON.parse(localStorage.getItem("utilisateur") || "null"));
  const [loginForm, setLoginForm] = useState({ login: "", mot_de_passe: "" });
  const [loginErreur, setLoginErreur] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const isAdmin = utilisateur?.role === "admin";

  const headers = () => ({ "Content-Type": "application/json", "Authorization": `Bearer ${token}` });

  const seConnecter = async () => {
    setLoginErreur(""); setLoadingLogin(true);
    try {
      const response = await fetch(`${API}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(loginForm) });
      const data = await response.json();
      if (data.success) { setToken(data.token); setUtilisateur(data.utilisateur); localStorage.setItem("token", data.token); localStorage.setItem("utilisateur", JSON.stringify(data.utilisateur)); }
      else { setLoginErreur(data.error || "Login ou mot de passe incorrect"); }
    } catch (err) { setLoginErreur("Erreur de connexion au serveur !"); }
    setLoadingLogin(false);
  };

  const seDeconnecter = () => { setToken(null); setUtilisateur(null); localStorage.removeItem("token"); localStorage.removeItem("utilisateur"); setPage("stock"); };

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
  const [ficheStockDateDebut, setFicheStockDateDebut] = useState("");
  const [ficheStockDateFin, setFicheStockDateFin] = useState("");
  const [ficheStockDatePrecise, setFicheStockDatePrecise] = useState("");
  const [ficheStockMode, setFicheStockMode] = useState("periode");
  const [ficheStockData, setFicheStockData] = useState(null);
  const [loadingFicheStock, setLoadingFicheStock] = useState(false);
  const [saisieDate, setSaisieDate] = useState("");
  const [saisieEditionDate, setSaisieEditionDate] = useState("");
  const [stockInitialData, setStockInitialData] = useState([]);
  const [loadingStockInitial, setLoadingStockInitial] = useState(false);
  const [stockInitialEdite, setStockInitialEdite] = useState({});
  const [stockInitialSaisieDates, setStockInitialSaisieDates] = useState({});
  const [stockInitialEnEdition, setStockInitialEnEdition] = useState(null);
  const [stockInitialEditionVals, setStockInitialEditionVals] = useState({ quantite: 0, prix_unitaire: 0 });
  const [stockInitialEditionDate, setStockInitialEditionDate] = useState("");
  const [utilisateursData, setUtilisateursData] = useState([]);
  const [loadingUtilisateurs, setLoadingUtilisateurs] = useState(false);
  const [newUtilisateur, setNewUtilisateur] = useState({ login: "", mot_de_passe: "", nom: "", role: "utilisateur" });
  const [showFormUtilisateur, setShowFormUtilisateur] = useState(false);
  const [utilisateurAModifier, setUtilisateurAModifier] = useState(null);

  // ETATS SITUATION FINANCIERE CLIENT
  const [sfClientSelectionne, setSfClientSelectionne] = useState("");
  const [sfDateInventaire, setSfDateInventaire] = useState("");
  const [sfSoldeInitial, setSfSoldeInitial] = useState({ montant: 0, date_debut: "", observation: "" });
  const [sfSoldeInitialId, setSfSoldeInitialId] = useState(null);
  const [sfStockInitialClient, setSfStockInitialClient] = useState([]);
  const [sfStockInitialEdite, setSfStockInitialEdite] = useState({});
  const [sfInventaireEdite, setSfInventaireEdite] = useState({});
  const [sfPerimesEdite, setSfPerimesEdite] = useState({});
  const [sfSituationData, setSfSituationData] = useState(null);
  const [sfLoading, setSfLoading] = useState(false);
  const [sfEtape, setSfEtape] = useState(1);
  const [sfSaisieDate, setSfSaisieDate] = useState("");

  // ETATS VERSEMENTS
  const [versementsData, setVersementsData] = useState([]);
  const [newVersement, setNewVersement] = useState({ date_versement: "", montant: "", mode_paiement: "", reference: "", observation: "" });
  const [newVersementDate, setNewVersementDate] = useState("");
  const [showFormVersement, setShowFormVersement] = useState(false);

  const chargerStats = () => {
    if (!token) return;
    Promise.all([
      fetch(`${API}/produits`, { headers: headers() }).then((r) => r.json()),
      fetch(`${API}/clients`, { headers: headers() }).then((r) => r.json()),
      fetch(`${API}/fournisseurs`, { headers: headers() }).then((r) => r.json()),
      fetch(`${API}/stock`, { headers: headers() }).then((r) => r.json()),
    ]).then(([produits, clients, fournisseurs, stock]) => {
      if (produits.error || clients.error) return;
      setStats({ produits: produits.length, clients: clients.length, fournisseurs: fournisseurs.length, rupture: stock.filter((s) => Number(s.stock_actuel) <= 0).length });
      setFournisseurs(fournisseurs); setClients(clients); setProduits(produits); setStockData(stock);
    });
  };

  useEffect(() => { if (token) chargerStats(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) return;
    if (["bon-entree", "bon-sortie", "mouvements", "fiche-stock", "stock-initial", "utilisateurs", "situation-financiere"].includes(page)) return;
    setLoading(true); setDonnees([]); setRecherche(""); setShowForm(false); setMessage(""); setBonDetail(null); setShowEditBon(false);
    const url = page === "liste-entree" ? `${API}/bons-entree` : page === "liste-sortie" ? `${API}/bons-sortie` : `${API}/${page}`;
    fetch(url, { headers: headers() }).then((res) => res.json()).then((data) => { setDonnees(data); setLoading(false); }).catch(() => setLoading(false));
  }, [page, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const produitsRuptureTotale = stockData.filter((s) => Number(s.stock_actuel) <= 0);
  const produitsStockFaible = stockData.filter((s) => Number(s.stock_actuel) > 0 && s.stock_minimum !== null && Number(s.stock_actuel) <= Number(s.stock_minimum));
  const totalAlertes = produitsRuptureTotale.length + produitsStockFaible.length;
  const dataStockActuel = stockData.map((s) => ({ name: s.code_produit, designation: s.designation, "Stock Initial": Number(s.stock_initial), "Stock Actuel": Number(s.stock_actuel), "Stock Minimum": Number(s.stock_minimum) || 0 }));
  const dataEntreesSorties = stockData.map((s) => ({ name: s.code_produit, designation: s.designation, "Entrees": Number(s.total_entree), "Sorties": Number(s.total_sortie) }));

  const resetBon = () => { setBon({ numero_bon: "", date_bon: "", id_fournisseur: "", id_client: "", observation: "" }); setLignes([{ id_produit: "", quantite: "", prix_unitaire: "" }]); setMessage(""); setSaisieDate(""); setSaisieEditionDate(""); };
  const ajouterLigne = () => setLignes([...lignes, { id_produit: "", quantite: "", prix_unitaire: "" }]);
  const supprimerLigne = (index) => setLignes(lignes.filter((_, i) => i !== index));
  const modifierLigne = (index, champ, valeur) => { const newLignes = [...lignes]; newLignes[index][champ] = valeur; setLignes(newLignes); };
  const ajouterLigneEdition = () => setLignesEdition([...lignesEdition, { id_produit: "", quantite: "", prix_unitaire: "" }]);
  const supprimerLigneEdition = (index) => setLignesEdition(lignesEdition.filter((_, i) => i !== index));
  const modifierLigneEdition = (index, champ, valeur) => { const newLignes = [...lignesEdition]; newLignes[index][champ] = valeur; setLignesEdition(newLignes); };

  const formatDateFR = (dateStr) => { if (!dateStr || dateStr === "-") return "-"; const parts = dateStr.split("-"); if (parts.length !== 3) return dateStr; return `${parts[2]}/${parts[1]}/${parts[0]}`; };
  const dateValide = (val) => { if (!val || val.length !== 10) return false; const p = val.split("/"); if (p.length !== 3) return false; const j = parseInt(p[0]), m = parseInt(p[1]), a = parseInt(p[2]); if (isNaN(j) || isNaN(m) || isNaN(a)) return false; if (j < 1 || j > 31) return false; if (m < 1 || m > 12) return false; if (a < 1900 || a > 2100) return false; const date = new Date(a, m - 1, j); return date.getFullYear() === a && date.getMonth() === m - 1 && date.getDate() === j; };
  const parseFR = (val) => { const p = val.split("/"); return p.length === 3 ? `${p[2]}-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}` : val; };

  const soumettreBon = async (type) => {
    if (!bon.numero_bon || !bon.date_bon) { setMessage("Champs obligatoires manquants !"); return; }
    if (!dateValide(formatDateFR(bon.date_bon))) { setMessage("Date invalide !"); return; }
    if (type === "bon-entree" && !bon.id_fournisseur) { setMessage("Choisissez un fournisseur !"); return; }
    if (type === "bon-sortie" && !bon.id_client) { setMessage("Choisissez un client !"); return; }
    const body = type === "bon-entree" ? { numero_bon: bon.numero_bon, date_bon: bon.date_bon, id_fournisseur: bon.id_fournisseur, observation: bon.observation, lignes } : { numero_bon: bon.numero_bon, date_bon: bon.date_bon, id_client: bon.id_client, observation: bon.observation, lignes };
    try {
      const response = await fetch(`${API}/${type}`, { method: "POST", headers: headers(), body: JSON.stringify(body) });
      const data = await response.json();
      if (data.success) { setMessage("Bon enregistre avec succes !"); resetBon(); chargerStats(); } else { setMessage("Erreur : " + data.error); }
    } catch (err) { setMessage("Erreur de connexion !"); }
  };

  const ajouterElement = async () => {
    let url = "", body = {};
    if (page === "produits") { url = `${API}/produits`; body = newProduit; }
    else if (page === "clients") { url = `${API}/clients`; body = newClient; }
    else if (page === "fournisseurs") { url = `${API}/fournisseurs`; body = newFournisseur; }
    try {
      const response = await fetch(url, { method: "POST", headers: headers(), body: JSON.stringify(body) });
      const data = await response.json();
      if (data.success) {
        setMessage("Ajoute avec succes !"); setShowForm(false);
        setNewProduit({ code_produit: "", designation: "", unite: "", prix_achat: "", prix_vente: "", stock_minimum: "" });
        setNewClient({ code_client: "", nom: "", telephone: "", adresse: "" });
        setNewFournisseur({ code_fournisseur: "", nom: "", telephone: "", adresse: "" });
        fetch(`${API}/${page}`, { headers: headers() }).then((r) => r.json()).then(setDonnees); chargerStats();
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
      const response = await fetch(url, { method: "DELETE", headers: headers() });
      const data = await response.json();
      if (data.success) { setMessage("Supprime avec succes !"); fetch(`${API}/${page}`, { headers: headers() }).then((r) => r.json()).then(setDonnees); chargerStats(); }
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
      const response = await fetch(url, { method: "PUT", headers: headers(), body: JSON.stringify(elementAModifier) });
      const data = await response.json();
      if (data.id_produit || data.id_client || data.id_fournisseur) {
        setMessage("Modifie avec succes !"); setShowEditModal(false); setElementAModifier(null);
        fetch(`${API}/${page}`, { headers: headers() }).then((r) => r.json()).then(setDonnees); chargerStats();
      } else { setMessage("Erreur lors de la modification !"); }
    } catch (err) { setMessage("Erreur de connexion !"); }
  };

  const ouvrirModificationBon = async (bonData, type) => {
    setBonEnEdition({ ...bonData, _type: type }); setSaisieEditionDate("");
    const url = type === "entree" ? `${API}/bons-entree/${bonData.id_bon_entree}/lignes` : `${API}/bons-sortie/${bonData.id_bon_sortie}/lignes`;
    const lignesData = await fetch(url, { headers: headers() }).then((r) => r.json());
    setLignesEdition(lignesData.map((l) => ({ id_produit: l.id_produit, quantite: l.quantite, prix_unitaire: l.prix_unitaire })));
    setShowEditBon(true); setBonDetail(null);
  };

  const enregistrerModificationBon = async () => {
    const type = bonEnEdition._type;
    const id = type === "entree" ? bonEnEdition.id_bon_entree : bonEnEdition.id_bon_sortie;
    const url = type === "entree" ? `${API}/bons-entree/${id}` : `${API}/bons-sortie/${id}`;
    const body = type === "entree" ? { numero_bon: bonEnEdition.numero_bon, date_bon: bonEnEdition.date_bon, id_fournisseur: bonEnEdition.id_fournisseur, observation: bonEnEdition.observation, lignes: lignesEdition } : { numero_bon: bonEnEdition.numero_bon, date_bon: bonEnEdition.date_bon, id_client: bonEnEdition.id_client, observation: bonEnEdition.observation, lignes: lignesEdition };
    try {
      const response = await fetch(url, { method: "PUT", headers: headers(), body: JSON.stringify(body) });
      const data = await response.json();
      if (data.success) {
        setMessage("Bon modifie avec succes !"); setShowEditBon(false); setBonEnEdition(null);
        const listeUrl = type === "entree" ? `${API}/bons-entree` : `${API}/bons-sortie`;
        fetch(listeUrl, { headers: headers() }).then((r) => r.json()).then(setDonnees); chargerStats();
      } else { setMessage("Erreur : " + data.error); }
    } catch (err) { setMessage("Erreur de connexion !"); }
  };

  const supprimerBon = async (id, type) => {
    if (!window.confirm("Confirmer la suppression de ce bon ?")) return;
    const url = type === "entree" ? `${API}/bons-entree/${id}` : `${API}/bons-sortie/${id}`;
    try {
      const response = await fetch(url, { method: "DELETE", headers: headers() });
      const data = await response.json();
      if (data.success) {
        setMessage("Bon supprime avec succes !"); setBonDetail(null);
        const listeUrl = type === "entree" ? `${API}/bons-entree` : `${API}/bons-sortie`;
        fetch(listeUrl, { headers: headers() }).then((r) => r.json()).then(setDonnees); chargerStats();
      } else { setMessage("Erreur : " + data.error); }
    } catch (err) { setMessage("Erreur de connexion !"); }
  };

  const voirDetailBon = async (bon, type) => {
    setBonDetail(bon);
    const url = type === "entree" ? `${API}/bons-entree/${bon.id_bon_entree}/lignes` : `${API}/bons-sortie/${bon.id_bon_sortie}/lignes`;
    const lignes = await fetch(url, { headers: headers() }).then((r) => r.json());
    setLignesDetail(lignes);
  };

  const chargerMouvements = async () => {
    if (!produitSelectionne) return;
    setLoadingMouvements(true); setFicheMouvements(null);
    try { const data = await fetch(`${API}/mouvements/${produitSelectionne}`, { headers: headers() }).then((r) => r.json()); setFicheMouvements(data); }
    catch (err) { setMessage("Erreur de chargement des mouvements !"); }
    setLoadingMouvements(false);
  };

  const chargerStockInitial = async () => {
    setLoadingStockInitial(true);
    try {
      const data = await fetch(`${API}/stock-initial`, { headers: headers() }).then((r) => r.json());
      setStockInitialData(data);
      const edits = {}, dates = {};
      data.forEach((p) => {
        edits[p.id_produit] = { quantite: p.quantite || 0, prix_unitaire: p.prix_unitaire || 0 };
        dates[p.id_produit] = p.date_saisie ? formatDateFR(p.date_saisie.substring(0, 10)) : "";
      });
      setStockInitialEdite(edits); setStockInitialSaisieDates(dates);
    } catch (err) { setMessage("Erreur de chargement du stock initial !"); }
    setLoadingStockInitial(false);
  };

  const enregistrerStockInitial = async (id_produit) => {
    const vals = stockInitialEdite[id_produit];
    const dateStr = stockInitialSaisieDates[id_produit];
    if (!vals) return;
    if (dateStr && !dateValide(dateStr)) { setMessage("Date invalide pour ce produit !"); return; }
    const date_saisie = dateStr && dateValide(dateStr) ? parseFR(dateStr) : null;
    try {
      const response = await fetch(`${API}/stock-initial`, { method: "POST", headers: headers(), body: JSON.stringify({ id_produit, quantite: vals.quantite, prix_unitaire: vals.prix_unitaire, date_saisie }) });
      const data = await response.json();
      if (data.success) { setMessage("Stock initial enregistre avec succes !"); chargerStockInitial(); chargerStats(); }
      else { setMessage("Erreur : " + data.error); }
    } catch (err) { setMessage("Erreur de connexion !"); }
  };

  const ouvrirModificationStockInitial = (p) => {
    setStockInitialEnEdition(p.id_produit);
    setStockInitialEditionVals({ quantite: p.quantite || 0, prix_unitaire: p.prix_unitaire || 0 });
    setStockInitialEditionDate(p.date_saisie ? formatDateFR(p.date_saisie.substring(0, 10)) : "");
  };

  const enregistrerModificationStockInitial = async () => {
    const dateStr = stockInitialEditionDate;
    if (dateStr && !dateValide(dateStr)) { setMessage("Date invalide !"); return; }
    const date_saisie = dateStr && dateValide(dateStr) ? parseFR(dateStr) : null;
    try {
      const response = await fetch(`${API}/stock-initial/${stockInitialEnEdition}`, { method: "PUT", headers: headers(), body: JSON.stringify({ quantite: stockInitialEditionVals.quantite, prix_unitaire: stockInitialEditionVals.prix_unitaire, date_saisie }) });
      const data = await response.json();
      if (data.success) { setMessage("Stock initial modifie avec succes !"); setStockInitialEnEdition(null); chargerStockInitial(); chargerStats(); }
      else { setMessage("Erreur : " + data.error); }
    } catch (err) { setMessage("Erreur de connexion !"); }
  };

  const chargerUtilisateurs = async () => {
    setLoadingUtilisateurs(true);
    try { const data = await fetch(`${API}/utilisateurs`, { headers: headers() }).then((r) => r.json()); setUtilisateursData(data); }
    catch (err) { setMessage("Erreur de chargement des utilisateurs !"); }
    setLoadingUtilisateurs(false);
  };

  const ajouterUtilisateur = async () => {
    if (!newUtilisateur.login || !newUtilisateur.mot_de_passe || !newUtilisateur.nom) { setMessage("Tous les champs sont obligatoires !"); return; }
    try {
      const response = await fetch(`${API}/utilisateurs`, { method: "POST", headers: headers(), body: JSON.stringify(newUtilisateur) });
      const data = await response.json();
      if (data.success) { setMessage("Utilisateur cree avec succes !"); setShowFormUtilisateur(false); setNewUtilisateur({ login: "", mot_de_passe: "", nom: "", role: "utilisateur" }); chargerUtilisateurs(); }
      else { setMessage("Erreur : " + data.error); }
    } catch (err) { setMessage("Erreur de connexion !"); }
  };

  const modifierUtilisateur = async () => {
    try {
      const response = await fetch(`${API}/utilisateurs/${utilisateurAModifier.id_utilisateur}`, { method: "PUT", headers: headers(), body: JSON.stringify(utilisateurAModifier) });
      const data = await response.json();
      if (data.success) { setMessage("Utilisateur modifie avec succes !"); setUtilisateurAModifier(null); chargerUtilisateurs(); }
      else { setMessage("Erreur : " + data.error); }
    } catch (err) { setMessage("Erreur de connexion !"); }
  };

  const supprimerUtilisateur = async (id) => {
    if (!window.confirm("Confirmer la suppression ?")) return;
    try {
      const response = await fetch(`${API}/utilisateurs/${id}`, { method: "DELETE", headers: headers() });
      const data = await response.json();
      if (data.success) { setMessage("Utilisateur supprime !"); chargerUtilisateurs(); }
      else { setMessage("Erreur : " + data.error); }
    } catch (err) { setMessage("Erreur de connexion !"); }
  };

  useEffect(() => {
    if (page === "stock-initial") chargerStockInitial(); // eslint-disable-line react-hooks/exhaustive-deps
    if (page === "utilisateurs") chargerUtilisateurs(); // eslint-disable-line react-hooks/exhaustive-deps
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const chargerFicheStock = async () => {
    let dateDebut, dateFin;
    if (ficheStockMode === "date") {
      if (!ficheStockDatePrecise || !dateValide(ficheStockDatePrecise)) { setMessage("Veuillez saisir une date valide !"); return; }
      dateDebut = parseFR(ficheStockDatePrecise); dateFin = parseFR(ficheStockDatePrecise);
    } else {
      if (!ficheStockDateDebut || !dateValide(ficheStockDateDebut)) { setMessage("Date debut invalide !"); return; }
      if (!ficheStockDateFin || !dateValide(ficheStockDateFin)) { setMessage("Date fin invalide !"); return; }
      dateDebut = parseFR(ficheStockDateDebut); dateFin = parseFR(ficheStockDateFin);
    }
    setLoadingFicheStock(true); setFicheStockData(null);
    try {
      const data = await fetch(`${API}/fiche-stock?date_debut=${dateDebut}&date_fin=${dateFin}`, { headers: headers() }).then((r) => r.json());
      setFicheStockData({ lignes: data, dateDebut: ficheStockMode === "date" ? ficheStockDatePrecise : ficheStockDateDebut, dateFin: ficheStockMode === "date" ? ficheStockDatePrecise : ficheStockDateFin });
    } catch (err) { setMessage("Erreur de chargement !"); }
    setLoadingFicheStock(false);
  };

  const imprimerFicheStockPDF = () => {
    if (!ficheStockData) return;
    const doc = new jsPDF(); const couleur = [13, 110, 253];
    doc.setFillColor(...couleur); doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.setFont("helvetica", "bold");
    doc.text("GESTION DE STOCK", 105, 13, { align: "center" }); doc.setFontSize(13); doc.text("FICHE DE STOCK", 105, 23, { align: "center" });
    doc.setTextColor(0, 0, 0); doc.setFontSize(11); doc.setFont("helvetica", "bold");
    if (ficheStockData.dateDebut === ficheStockData.dateFin) { doc.text(`Date : ${ficheStockData.dateDebut}`, 15, 42); } else { doc.text(`Periode : du ${ficheStockData.dateDebut} au ${ficheStockData.dateFin}`, 15, 42); }
    doc.setDrawColor(...couleur); doc.setLineWidth(0.5); doc.line(15, 48, 195, 48);
    autoTable(doc, { startY: 53, head: [["Code", "Designation", "Unite", "Stock Initial", "Total Entrees", "Total Sorties", "Stock Disponible"]], body: ficheStockData.lignes.map((l) => [l.code_produit, l.designation, l.unite, Number(l.stock_initial).toFixed(2), Number(l.total_entrees).toFixed(2), Number(l.total_sorties).toFixed(2), Number(l.stock_disponible).toFixed(2)]), headStyles: { fillColor: couleur, textColor: 255, fontStyle: "bold" }, alternateRowStyles: { fillColor: [249, 249, 249] }, styles: { fontSize: 9, cellPadding: 3 }, columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 55 }, 2: { cellWidth: 18 }, 3: { cellWidth: 23, halign: "right" }, 4: { cellWidth: 23, halign: "right" }, 5: { cellWidth: 23, halign: "right" }, 6: { cellWidth: 28, halign: "right" } } });
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(9); doc.setTextColor(150, 150, 150);
    doc.text(`Document genere le ${new Date().toLocaleDateString("fr-FR")} a ${new Date().toLocaleTimeString("fr-FR")}`, 105, pageHeight - 10, { align: "center" });
    doc.save(`Fiche_Stock_${ficheStockData.dateDebut}_${ficheStockData.dateFin}.pdf`);
  };

  const construireTableauMouvements = () => {
    if (!ficheMouvements) return [];
    const { stock_initial, entrees, sorties } = ficheMouvements;
    let lignesMouvements = [];
    if (Number(stock_initial.quantite) > 0) {
      lignesMouvements.push({ date: stock_initial.date_saisie ? formatDateFR(stock_initial.date_saisie.substring(0, 10)) : "-", numero_bon: "-", type: "Stock Initial", tiers: "-", entree: "-", sortie: "-", stock: Number(stock_initial.quantite) || 0, _classe: "table-info fw-bold" });
    }
    const mouvements = [...entrees.map((e) => ({ ...e, _type: "entree" })), ...sorties.map((s) => ({ ...s, _type: "sortie" }))].sort((a, b) => new Date(a.date_bon) - new Date(b.date_bon));
    let stockCourant = Number(stock_initial.quantite) || 0;
    mouvements.forEach((m) => {
      if (m._type === "entree") { stockCourant += Number(m.quantite); lignesMouvements.push({ date: formatDateFR(m.date_bon.substring(0, 10)), numero_bon: m.numero_bon, type: "Entree", tiers: m.nom_fournisseur, entree: Number(m.quantite), sortie: "-", stock: stockCourant, _classe: "table-success" }); }
      else { stockCourant -= Number(m.quantite); lignesMouvements.push({ date: formatDateFR(m.date_bon.substring(0, 10)), numero_bon: m.numero_bon, type: "Sortie", tiers: m.nom_client, entree: "-", sortie: Number(m.quantite), stock: stockCourant, _classe: "table-danger" }); }
    });
    return lignesMouvements;
  };

  const imprimerMouvementsPDF = () => {
    if (!ficheMouvements) return;
    const { produit, totaux } = ficheMouvements; const tableauLignes = construireTableauMouvements();
    const doc = new jsPDF({ orientation: "landscape" }); const couleur = [13, 110, 253];
    doc.setFillColor(...couleur); doc.rect(0, 0, 297, 25, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("GESTION DE STOCK", 148, 10, { align: "center" }); doc.setFontSize(12); doc.text("FICHE DE MOUVEMENTS", 148, 20, { align: "center" });
    doc.setTextColor(0, 0, 0); doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text(`Code : ${produit.code_produit}`, 15, 35); doc.text(`Designation : ${produit.designation}`, 60, 35); doc.text(`Unite : ${produit.unite}`, 150, 35); doc.text(`Prix Achat : ${produit.prix_achat} MRU`, 185, 35); doc.text(`Prix Vente : ${produit.prix_vente} MRU`, 237, 35);
    doc.setDrawColor(...couleur); doc.setLineWidth(0.5); doc.line(15, 40, 282, 40);
    autoTable(doc, { startY: 45, head: [["Date", "N° Bon", "Type", "Fournisseur / Client", "Entree", "Sortie", "Stock"]], body: tableauLignes.map((l) => [l.date, l.numero_bon, l.type, l.tiers, l.entree !== "-" ? l.entree : "", l.sortie !== "-" ? l.sortie : "", l.stock]), foot: [["", "", "", "TOTAUX :", totaux.total_entrees, totaux.total_sorties, totaux.stock_final]], headStyles: { fillColor: couleur, textColor: 255, fontStyle: "bold" }, footStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: "bold" }, alternateRowStyles: { fillColor: [249, 249, 249] }, styles: { fontSize: 9, cellPadding: 3 }, columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 25 }, 2: { cellWidth: 25 }, 3: { cellWidth: 90 }, 4: { cellWidth: 25, halign: "center" }, 5: { cellWidth: 25, halign: "center" }, 6: { cellWidth: 25, halign: "center" } }, didParseCell: (data) => { if (data.section === "body") { const type = tableauLignes[data.row.index]?.type; if (type === "Stock Initial") data.cell.styles.fillColor = [217, 237, 247]; else if (type === "Entree") data.cell.styles.fillColor = [212, 237, 218]; else if (type === "Sortie") data.cell.styles.fillColor = [248, 215, 218]; } } });
    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.setFillColor(23, 162, 184); doc.rect(15, finalY, 55, 12, "F"); doc.setFillColor(25, 135, 84); doc.rect(75, finalY, 55, 12, "F"); doc.setFillColor(220, 53, 69); doc.rect(135, finalY, 55, 12, "F"); doc.setFillColor(13, 110, 253); doc.rect(195, finalY, 55, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(`Stock Initial: ${totaux.qte_initiale}`, 42, finalY + 8, { align: "center" }); doc.text(`Total Entrees: +${totaux.total_entrees}`, 102, finalY + 8, { align: "center" }); doc.text(`Total Sorties: -${totaux.total_sorties}`, 162, finalY + 8, { align: "center" }); doc.text(`Stock Final: ${totaux.stock_final}`, 222, finalY + 8, { align: "center" });
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8); doc.setTextColor(150, 150, 150); doc.setFont("helvetica", "normal");
    doc.text(`Document genere le ${new Date().toLocaleDateString("fr-FR")} a ${new Date().toLocaleTimeString("fr-FR")}`, 148, pageHeight - 8, { align: "center" });
    doc.save(`Fiche_Mouvements_${produit.code_produit}_${produit.designation}.pdf`);
  };

  const imprimerBonPDF = (type) => {
    const doc = new jsPDF(); const estEntree = type === "entree"; const titre = estEntree ? "BON D'ENTREE" : "BON DE SORTIE"; const couleur = estEntree ? [13, 110, 253] : [25, 135, 84];
    doc.setFillColor(...couleur); doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.setFont("helvetica", "bold");
    doc.text("GESTION DE STOCK", 105, 13, { align: "center" }); doc.setFontSize(13); doc.text(titre, 105, 23, { align: "center" });
    doc.setTextColor(0, 0, 0); doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("Numero du Bon :", 15, 42); doc.text("Date :", 15, 52); doc.text(estEntree ? "Fournisseur :" : "Client :", 15, 62); doc.text("Observation :", 15, 72);
    doc.setFont("helvetica", "normal");
    doc.text(bonDetail.numero_bon || "-", 60, 42); doc.text(formatDateFR(bonDetail.date_bon?.substring(0, 10)) || "-", 60, 52);
    doc.text(estEntree ? (bonDetail.nom_fournisseur || "-") : (bonDetail.nom_client || "-"), 60, 62); doc.text(bonDetail.observation || "-", 60, 72);
    doc.setDrawColor(...couleur); doc.setLineWidth(0.5); doc.line(15, 78, 195, 78);
    const formatMontant = (val) => Number(val).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    const totalGeneral = lignesDetail.reduce((sum, l) => sum + Number(l.montant || 0), 0);
    autoTable(doc, { startY: 83, head: [["Code", "Designation", "Quantite", "Prix Unitaire", "Montant (MRU)"]], body: lignesDetail.map((l) => [l.code_produit || "-", l.designation || "-", l.quantite, formatMontant(l.prix_unitaire), formatMontant(l.montant)]), foot: [["", "", "", "TOTAL GENERAL :", formatMontant(totalGeneral) + " MRU"]], headStyles: { fillColor: couleur, textColor: 255, fontStyle: "bold" }, footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: "bold" }, alternateRowStyles: { fillColor: [249, 249, 249] }, styles: { fontSize: 10, cellPadding: 4 }, columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 70 }, 2: { cellWidth: 25, halign: "center" }, 3: { cellWidth: 35, halign: "right" }, 4: { cellWidth: 35, halign: "right" } } });
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(9); doc.setTextColor(150, 150, 150);
    doc.text(`Document genere le ${new Date().toLocaleDateString("fr-FR")} a ${new Date().toLocaleTimeString("fr-FR")}`, 105, pageHeight - 10, { align: "center" });
    doc.save(`${titre.replace(" ", "_")}_${bonDetail.numero_bon}.pdf`);
  };

  const renderLogin = () => (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow" style={{ width: "400px" }}>
        <div className="card-header bg-primary text-white text-center py-4"><h3 className="mb-0">📦 Gestion de Stock</h3><small>Connectez-vous pour acceder</small></div>
        <div className="card-body p-4">
          {loginErreur && <div className="alert alert-danger">{loginErreur}</div>}
          <div className="mb-3"><label className="form-label fw-bold">Login</label><input type="text" className="form-control" placeholder="Votre login" value={loginForm.login} onChange={(e) => setLoginForm({ ...loginForm, login: e.target.value })} onKeyDown={(e) => e.key === "Enter" && seConnecter()} /></div>
          <div className="mb-4"><label className="form-label fw-bold">Mot de passe</label><input type="password" className="form-control" placeholder="Votre mot de passe" value={loginForm.mot_de_passe} onChange={(e) => setLoginForm({ ...loginForm, mot_de_passe: e.target.value })} onKeyDown={(e) => e.key === "Enter" && seConnecter()} /></div>
          <button className="btn btn-primary w-100 btn-lg" onClick={seConnecter} disabled={loadingLogin}>{loadingLogin ? <><span className="spinner-border spinner-border-sm me-2"></span>Connexion...</> : "🔐 Se Connecter"}</button>
        </div>
      </div>
    </div>
  );

  const renderUtilisateurs = () => (
    <div>
      <h4 className="mb-4">👥 Gestion des Utilisateurs</h4>
      {message && (<div className={`alert ${message.includes("succes") ? "alert-success" : "alert-danger"} alert-dismissible`}>{message}<button className="btn-close" onClick={() => setMessage("")}></button></div>)}
      <button className="btn btn-success mb-3" onClick={() => setShowFormUtilisateur(!showFormUtilisateur)}>{showFormUtilisateur ? "Annuler" : "+ Nouvel Utilisateur"}</button>
      {showFormUtilisateur && (
        <div className="card p-3 mb-3 border-success"><h5 className="mb-3">Nouvel Utilisateur</h5>
          <div className="row g-2">
            <div className="col-md-3"><input className="form-control" placeholder="Login *" value={newUtilisateur.login} onChange={(e) => setNewUtilisateur({ ...newUtilisateur, login: e.target.value })} /></div>
            <div className="col-md-3"><input className="form-control" placeholder="Nom complet *" value={newUtilisateur.nom} onChange={(e) => setNewUtilisateur({ ...newUtilisateur, nom: e.target.value })} /></div>
            <div className="col-md-3"><input type="password" className="form-control" placeholder="Mot de passe *" value={newUtilisateur.mot_de_passe} onChange={(e) => setNewUtilisateur({ ...newUtilisateur, mot_de_passe: e.target.value })} /></div>
            <div className="col-md-3"><select className="form-select" value={newUtilisateur.role} onChange={(e) => setNewUtilisateur({ ...newUtilisateur, role: e.target.value })}><option value="utilisateur">Utilisateur</option><option value="admin">Admin</option></select></div>
          </div>
          <div className="mt-2"><button className="btn btn-success me-2" onClick={ajouterUtilisateur}>Enregistrer</button><button className="btn btn-secondary" onClick={() => setShowFormUtilisateur(false)}>Annuler</button></div>
        </div>
      )}
      {loadingUtilisateurs ? (<div className="text-center"><div className="spinner-border text-primary"></div></div>) : (
        <table className="table table-bordered table-hover">
          <thead className="table-dark"><tr><th>Login</th><th>Nom</th><th>Role</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>{utilisateursData.map((u) => (<tr key={u.id_utilisateur}><td>{u.login}</td><td>{u.nom}</td><td><span className={`badge ${u.role === "admin" ? "bg-danger" : "bg-primary"}`}>{u.role === "admin" ? "👑 Admin" : "👤 Utilisateur"}</span></td><td><span className={`badge ${u.actif ? "bg-success" : "bg-secondary"}`}>{u.actif ? "Actif" : "Inactif"}</span></td><td><button className="btn btn-warning btn-sm me-2" onClick={() => setUtilisateurAModifier({ ...u, mot_de_passe: "" })}>✏️ Modifier</button>{u.login !== "admin" && <button className="btn btn-danger btn-sm" onClick={() => supprimerUtilisateur(u.id_utilisateur)}>🗑️ Supprimer</button>}</td></tr>))}</tbody>
        </table>
      )}
      {utilisateurAModifier && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog"><div className="modal-content">
            <div className="modal-header bg-warning"><h5 className="modal-title">✏️ Modifier Utilisateur</h5><button className="btn-close" onClick={() => setUtilisateurAModifier(null)}></button></div>
            <div className="modal-body">
              <div className="mb-3"><label className="form-label">Login</label><input className="form-control" value={utilisateurAModifier.login} onChange={(e) => setUtilisateurAModifier({ ...utilisateurAModifier, login: e.target.value })} /></div>
              <div className="mb-3"><label className="form-label">Nom</label><input className="form-control" value={utilisateurAModifier.nom} onChange={(e) => setUtilisateurAModifier({ ...utilisateurAModifier, nom: e.target.value })} /></div>
              <div className="mb-3"><label className="form-label">Nouveau mot de passe (laisser vide pour ne pas changer)</label><input type="password" className="form-control" value={utilisateurAModifier.mot_de_passe} onChange={(e) => setUtilisateurAModifier({ ...utilisateurAModifier, mot_de_passe: e.target.value })} /></div>
              <div className="mb-3"><label className="form-label">Role</label><select className="form-select" value={utilisateurAModifier.role} onChange={(e) => setUtilisateurAModifier({ ...utilisateurAModifier, role: e.target.value })}><option value="utilisateur">Utilisateur</option><option value="admin">Admin</option></select></div>
              <div className="mb-3"><label className="form-label">Statut</label><select className="form-select" value={utilisateurAModifier.actif} onChange={(e) => setUtilisateurAModifier({ ...utilisateurAModifier, actif: e.target.value === "true" })}><option value="true">Actif</option><option value="false">Inactif</option></select></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setUtilisateurAModifier(null)}>Annuler</button><button className="btn btn-warning" onClick={modifierUtilisateur}>💾 Enregistrer</button></div>
          </div></div>
        </div>
      )}
    </div>
  );

  const renderStockInitial = () => (
    <div>
      <h4 className="mb-4">📦 Saisie du Stock Initial</h4>
      <div className="alert alert-info"><strong>ℹ️ Information :</strong> Le stock initial représente la quantité de départ de chaque produit avant tout mouvement.</div>
      {message && (<div className={`alert ${message.includes("succes") ? "alert-success" : "alert-danger"} alert-dismissible`}>{message}<button className="btn-close" onClick={() => setMessage("")}></button></div>)}
      {loadingStockInitial ? (<div className="text-center my-4"><div className="spinner-border text-primary"></div></div>) : (
        <div className="card p-0">
          <table className="table table-bordered table-hover mb-0">
            <thead className="table-dark">
              <tr><th>Code</th><th>Designation</th><th>Unite</th><th className="text-center">Quantite Initiale</th><th className="text-center">Prix Unitaire (MRU)</th><th className="text-center">Date Saisie (jj/mm/aaaa)</th><th className="text-center">Action</th></tr>
            </thead>
            <tbody>
              {stockInitialData.map((p) => (
                <tr key={p.id_produit} className={Number(stockInitialEdite[p.id_produit]?.quantite) > 0 ? "table-success" : ""}>
                  <td><strong>{p.code_produit}</strong></td><td>{p.designation}</td><td>{p.unite}</td>
                  <td className="text-center"><input type="number" className="form-control form-control-sm text-center" min="0" style={{ width: "100px", margin: "auto" }} value={stockInitialEdite[p.id_produit]?.quantite || 0} onChange={(e) => setStockInitialEdite({ ...stockInitialEdite, [p.id_produit]: { ...stockInitialEdite[p.id_produit], quantite: e.target.value } })} /></td>
                  <td className="text-center"><input type="number" className="form-control form-control-sm text-center" min="0" style={{ width: "120px", margin: "auto" }} value={stockInitialEdite[p.id_produit]?.prix_unitaire || 0} onChange={(e) => setStockInitialEdite({ ...stockInitialEdite, [p.id_produit]: { ...stockInitialEdite[p.id_produit], prix_unitaire: e.target.value } })} /></td>
                  <td className="text-center"><input type="text" placeholder="jj/mm/aaaa" maxLength={10} className={`form-control form-control-sm text-center ${stockInitialSaisieDates[p.id_produit] && !dateValide(stockInitialSaisieDates[p.id_produit]) ? "is-invalid" : stockInitialSaisieDates[p.id_produit] && dateValide(stockInitialSaisieDates[p.id_produit]) ? "is-valid" : ""}`} style={{ width: "130px", margin: "auto" }} value={stockInitialSaisieDates[p.id_produit] || ""} onChange={(e) => setStockInitialSaisieDates({ ...stockInitialSaisieDates, [p.id_produit]: e.target.value })} /></td>
                  <td className="text-center">
                    <button className="btn btn-success btn-sm me-1" onClick={() => enregistrerStockInitial(p.id_produit)}>💾 Enregistrer</button>
                    <button className="btn btn-warning btn-sm" onClick={() => ouvrirModificationStockInitial(p)}>✏️ Modifier</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stockInitialEnEdition && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog"><div className="modal-content">
            <div className="modal-header bg-warning"><h5 className="modal-title">✏️ Modifier Stock Initial — {stockInitialData.find(p => p.id_produit === stockInitialEnEdition)?.designation}</h5><button className="btn-close" onClick={() => setStockInitialEnEdition(null)}></button></div>
            <div className="modal-body">
              <div className="mb-3"><label className="form-label fw-bold">Quantite Initiale</label><input type="number" min="0" className="form-control" value={stockInitialEditionVals.quantite} onChange={(e) => setStockInitialEditionVals({ ...stockInitialEditionVals, quantite: e.target.value })} /></div>
              <div className="mb-3"><label className="form-label fw-bold">Prix Unitaire (MRU)</label><input type="number" min="0" className="form-control" value={stockInitialEditionVals.prix_unitaire} onChange={(e) => setStockInitialEditionVals({ ...stockInitialEditionVals, prix_unitaire: e.target.value })} /></div>
              <div className="mb-3">
                <label className="form-label fw-bold">Date Saisie (jj/mm/aaaa)</label>
                <input type="text" placeholder="jj/mm/aaaa" maxLength={10} className={`form-control ${stockInitialEditionDate && !dateValide(stockInitialEditionDate) ? "is-invalid" : stockInitialEditionDate && dateValide(stockInitialEditionDate) ? "is-valid" : ""}`} value={stockInitialEditionDate} onChange={(e) => setStockInitialEditionDate(e.target.value)} />
                {stockInitialEditionDate && !dateValide(stockInitialEditionDate) && <div className="invalid-feedback">Date invalide (ex: 01/01/2026)</div>}
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setStockInitialEnEdition(null)}>Annuler</button><button className="btn btn-warning" onClick={enregistrerModificationStockInitial}>💾 Enregistrer</button></div>
          </div></div>
        </div>
      )}
    </div>
  );

  const renderFicheStock = () => (
    <div>
      <h4 className="mb-4">📊 Fiche de Stock</h4>
      <div className="card p-3 mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-md-3"><label className="form-label fw-bold">Mode de filtre</label><select className="form-select" value={ficheStockMode} onChange={(e) => { setFicheStockMode(e.target.value); setFicheStockData(null); }}><option value="periode">Periode (date debut → date fin)</option><option value="date">Date precise</option></select></div>
          {ficheStockMode === "date" ? (
            <div className="col-md-3"><label className="form-label fw-bold">Date (jj/mm/aaaa)</label><input type="text" className={`form-control ${ficheStockDatePrecise && !dateValide(ficheStockDatePrecise) ? "is-invalid" : ficheStockDatePrecise && dateValide(ficheStockDatePrecise) ? "is-valid" : ""}`} placeholder="jj/mm/aaaa" maxLength={10} value={ficheStockDatePrecise} onChange={(e) => { setFicheStockDatePrecise(e.target.value); setFicheStockData(null); }} />{ficheStockDatePrecise && !dateValide(ficheStockDatePrecise) && <div className="invalid-feedback">Date invalide</div>}</div>
          ) : (<>
            <div className="col-md-3"><label className="form-label fw-bold">Date Debut (jj/mm/aaaa)</label><input type="text" className={`form-control ${ficheStockDateDebut && !dateValide(ficheStockDateDebut) ? "is-invalid" : ficheStockDateDebut && dateValide(ficheStockDateDebut) ? "is-valid" : ""}`} placeholder="jj/mm/aaaa" maxLength={10} value={ficheStockDateDebut} onChange={(e) => { setFicheStockDateDebut(e.target.value); setFicheStockData(null); }} />{ficheStockDateDebut && !dateValide(ficheStockDateDebut) && <div className="invalid-feedback">Date invalide</div>}</div>
            <div className="col-md-3"><label className="form-label fw-bold">Date Fin (jj/mm/aaaa)</label><input type="text" className={`form-control ${ficheStockDateFin && !dateValide(ficheStockDateFin) ? "is-invalid" : ficheStockDateFin && dateValide(ficheStockDateFin) ? "is-valid" : ""}`} placeholder="jj/mm/aaaa" maxLength={10} value={ficheStockDateFin} onChange={(e) => { setFicheStockDateFin(e.target.value); setFicheStockData(null); }} />{ficheStockDateFin && !dateValide(ficheStockDateFin) && <div className="invalid-feedback">Date invalide</div>}</div>
          </>)}
          <div className="col-md-3"><button className="btn btn-primary w-100" onClick={chargerFicheStock}>🔍 Afficher la Fiche</button></div>
        </div>
      </div>
      {loadingFicheStock && (<div className="text-center my-4"><div className="spinner-border text-primary"></div></div>)}
      {ficheStockData && !loadingFicheStock && (
        <div className="card p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="text-primary">{ficheStockData.dateDebut === ficheStockData.dateFin ? `📅 Stock au ${ficheStockData.dateDebut}` : `📅 Stock du ${ficheStockData.dateDebut} au ${ficheStockData.dateFin}`}</h5>
            <button className="btn btn-success" onClick={imprimerFicheStockPDF}>🖨️ Imprimer PDF</button>
          </div>
          <table className="table table-bordered table-striped table-hover">
            <thead className="table-dark"><tr><th>Code</th><th>Designation</th><th>Unite</th><th className="text-center text-info">Stock Initial</th><th className="text-center text-success">Total Entrees</th><th className="text-center text-danger">Total Sorties</th><th className="text-center text-primary fw-bold">Stock Disponible</th></tr></thead>
            <tbody>{ficheStockData.lignes.map((l, i) => (<tr key={i} className={Number(l.stock_disponible) <= 0 ? "table-danger" : ""}><td>{l.code_produit}</td><td>{l.designation}</td><td>{l.unite}</td><td className="text-center">{Number(l.stock_initial).toFixed(2)}</td><td className="text-center text-success fw-bold">+{Number(l.total_entrees).toFixed(2)}</td><td className="text-center text-danger fw-bold">-{Number(l.total_sorties).toFixed(2)}</td><td className={`text-center fw-bold ${Number(l.stock_disponible) <= 0 ? "text-danger" : "text-primary"}`}>{Number(l.stock_disponible).toFixed(2)}</td></tr>))}</tbody>
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
          <div className="col-md-6"><label className="form-label fw-bold">Choisir un Produit</label><select className="form-select" value={produitSelectionne} onChange={(e) => { setProduitSelectionne(e.target.value); setFicheMouvements(null); }}><option value="">-- Selectionner un produit --</option>{produits.map((p) => (<option key={p.id_produit} value={p.id_produit}>{p.code_produit} — {p.designation}</option>))}</select></div>
          <div className="col-md-3"><button className="btn btn-primary w-100" onClick={chargerMouvements} disabled={!produitSelectionne}>🔍 Afficher les Mouvements</button></div>
        </div>
      </div>
      {loadingMouvements && (<div className="text-center my-4"><div className="spinner-border text-primary"></div></div>)}
      {ficheMouvements && !loadingMouvements && (() => {
        const tableauLignes = construireTableauMouvements(); const { produit, totaux } = ficheMouvements;
        return (
          <div className="card p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="row p-3 bg-primary text-white rounded w-100 me-3">
                <div className="col-md-3"><strong>Code :</strong> {produit.code_produit}</div><div className="col-md-3"><strong>Designation :</strong> {produit.designation}</div><div className="col-md-2"><strong>Unite :</strong> {produit.unite}</div><div className="col-md-2"><strong>Prix Achat :</strong> {produit.prix_achat} MRU</div><div className="col-md-2"><strong>Prix Vente :</strong> {produit.prix_vente} MRU</div>
              </div>
              <button className="btn btn-success text-nowrap" onClick={imprimerMouvementsPDF}>🖨️ Imprimer PDF</button>
            </div>
            <table className="table table-bordered table-hover">
              <thead className="table-dark"><tr><th>Date</th><th>N° Bon</th><th>Type</th><th>Fournisseur / Client</th><th className="text-center">Entree</th><th className="text-center">Sortie</th><th className="text-center">Stock</th></tr></thead>
              <tbody>{tableauLignes.map((ligne, i) => (<tr key={i} className={ligne._classe}><td>{ligne.date}</td><td>{ligne.numero_bon}</td><td>{ligne.type === "Stock Initial" && <span className="badge bg-info text-dark">📦 Stock Initial</span>}{ligne.type === "Entree" && <span className="badge bg-success">⬆️ Entree</span>}{ligne.type === "Sortie" && <span className="badge bg-danger">⬇️ Sortie</span>}</td><td>{ligne.tiers}</td><td className="text-center fw-bold text-success">{ligne.entree !== "-" ? ligne.entree : ""}</td><td className="text-center fw-bold text-danger">{ligne.sortie !== "-" ? ligne.sortie : ""}</td><td className="text-center fw-bold text-primary">{ligne.stock}</td></tr>))}</tbody>
              <tfoot className="table-dark fw-bold"><tr><td colSpan="4" className="text-end">TOTAUX :</td><td className="text-center text-success">{totaux.total_entrees}</td><td className="text-center text-danger">{totaux.total_sorties}</td><td className="text-center text-warning">{totaux.stock_final}</td></tr></tfoot>
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
        <ResponsiveContainer width="100%" height={350}><BarChart data={dataStockActuel} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 12 }} /><YAxis /><Tooltip formatter={(v, n) => [v, n]} labelFormatter={(l) => { const i = dataStockActuel.find((d) => d.name === l); return i ? i.designation : l; }} /><Legend verticalAlign="top" /><Bar dataKey="Stock Actuel" fill="#0d6efd" radius={[4, 4, 0, 0]} /><Bar dataKey="Stock Minimum" fill="#ffc107" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
      </div>
      <div className="card mb-4 p-3">
        <h5 className="mb-3 text-success">📈 Entrees vs Sorties par Produit</h5>
        <ResponsiveContainer width="100%" height={350}><BarChart data={dataEntreesSorties} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 12 }} /><YAxis /><Tooltip formatter={(v, n) => [v, n]} labelFormatter={(l) => { const i = dataEntreesSorties.find((d) => d.name === l); return i ? i.designation : l; }} /><Legend verticalAlign="top" /><Bar dataKey="Entrees" fill="#198754" radius={[4, 4, 0, 0]} /><Bar dataKey="Sorties" fill="#dc3545" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
      </div>
    </div>
  );

  const chargerVersements = async (id_client) => {
    try {
      const data = await fetch(`${API}/versements/${id_client}`, { headers: headers() }).then((r) => r.json());
      setVersementsData(data);
    } catch (err) { setMessage("Erreur chargement versements !"); }
  };

  const ajouterVersement = async () => {
    if (!newVersementDate || !dateValide(newVersementDate)) { setMessage("Date versement invalide !"); return; }
    if (!newVersement.montant || Number(newVersement.montant) <= 0) { setMessage("Montant invalide !"); return; }
    try {
      const response = await fetch(`${API}/versements`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({ id_client: sfClientSelectionne, date_versement: parseFR(newVersementDate), montant: newVersement.montant, mode_paiement: newVersement.mode_paiement, reference: newVersement.reference, observation: newVersement.observation })
      });
      const data = await response.json();
      if (data.success) {
        setMessage("Versement enregistre avec succes !");
        setNewVersement({ date_versement: "", montant: "", mode_paiement: "", reference: "", observation: "" });
        setNewVersementDate("");
        setShowFormVersement(false);
        chargerVersements(sfClientSelectionne);
      } else { setMessage("Erreur : " + data.error); }
    } catch (err) { setMessage("Erreur de connexion !"); }
  };

  const supprimerVersement = async (id) => {
    if (!window.confirm("Confirmer la suppression ?")) return;
    try {
      const response = await fetch(`${API}/versements/${id}`, { method: "DELETE", headers: headers() });
      const data = await response.json();
      if (data.success) { setMessage("Versement supprime !"); chargerVersements(sfClientSelectionne); }
      else { setMessage("Erreur : " + data.error); }
    } catch (err) { setMessage("Erreur de connexion !"); }
  };

  const chargerSituationFinanciere = async () => {
    if (!sfClientSelectionne || !sfDateInventaire || !dateValide(sfDateInventaire)) { setMessage("Choisissez un client et une date valide !"); return; }
    setSfLoading(true); setSfSituationData(null);
    try {
      const dateISO = parseFR(sfDateInventaire);
      const data = await fetch(`${API}/situation-financiere/${sfClientSelectionne}?date_inventaire=${dateISO}`, { headers: headers() }).then((r) => r.json());
      setSfSituationData(data);
    } catch (err) { setMessage("Erreur de chargement !"); }
    setSfLoading(false);
  };

  const chargerStockInitialClient = async () => {
    if (!sfClientSelectionne) return;
    setSfLoading(true);
    try {
      const [stockData, soldeData] = await Promise.all([
        fetch(`${API}/stock-initial-client/${sfClientSelectionne}`, { headers: headers() }).then((r) => r.json()),
        fetch(`${API}/solde-initial-client/${sfClientSelectionne}`, { headers: headers() }).then((r) => r.json()),
      ]);
      setSfStockInitialClient(stockData);
      const edits = {}, invEdits = {}, perEdits = {};
      stockData.forEach((p) => {
        edits[p.id_produit] = p.quantite || 0;
        invEdits[p.id_produit] = 0;
        perEdits[p.id_produit] = 0;
      });
      setSfStockInitialEdite(edits);
      setSfInventaireEdite(invEdits);
      setSfPerimesEdite(perEdits);
      if (soldeData) {
        setSfSoldeInitialId(soldeData.id_solde);
        setSfSoldeInitial({ montant: soldeData.montant || 0, date_debut: soldeData.date_debut ? formatDateFR(soldeData.date_debut.substring(0, 10)) : "", observation: soldeData.observation || "" });
      } else {
        setSfSoldeInitialId(null);
        setSfSoldeInitial({ montant: 0, date_debut: "", observation: "" });
      }
      await chargerVersements(sfClientSelectionne);
    } catch (err) { setMessage("Erreur de chargement !"); }
    setSfLoading(false);
  };

  const enregistrerSoldeInitial = async () => {
    try {
      const date_debut = sfSoldeInitial.date_debut && dateValide(sfSoldeInitial.date_debut) ? parseFR(sfSoldeInitial.date_debut) : null;
      if (sfSoldeInitialId) {
        await fetch(`${API}/solde-initial-client/${sfSoldeInitialId}`, { method: "PUT", headers: headers(), body: JSON.stringify({ montant: sfSoldeInitial.montant || 0, date_debut, observation: sfSoldeInitial.observation }) });
      } else {
        await fetch(`${API}/solde-initial-client`, { method: "POST", headers: headers(), body: JSON.stringify({ id_client: sfClientSelectionne, montant: sfSoldeInitial.montant || 0, date_debut, observation: sfSoldeInitial.observation }) });
      }
      setMessage("Solde initial enregistre avec succes !");
      chargerStockInitialClient();
    } catch (err) { setMessage("Erreur de connexion !"); }
  };

  const enregistrerStockInitialClient = async (id_produit) => {
    try {
      await fetch(`${API}/stock-initial-client`, { method: "POST", headers: headers(), body: JSON.stringify({ id_client: sfClientSelectionne, id_produit, quantite: sfStockInitialEdite[id_produit] || 0 }) });
      setMessage("Stock initial client enregistre !");
    } catch (err) { setMessage("Erreur de connexion !"); }
  };

  const enregistrerInventaireEtPerimes = async () => {
    if (!sfSaisieDate || !dateValide(sfSaisieDate)) { setMessage("Date d'inventaire invalide !"); return; }
    const dateISO = parseFR(sfSaisieDate);
    try {
      for (const id_produit of Object.keys(sfInventaireEdite)) {
        await fetch(`${API}/inventaire`, { method: "POST", headers: headers(), body: JSON.stringify({ id_client: sfClientSelectionne, id_produit, date_inventaire: dateISO, qte_inventaire: sfInventaireEdite[id_produit] || 0 }) });
        await fetch(`${API}/perimes`, { method: "POST", headers: headers(), body: JSON.stringify({ id_client: sfClientSelectionne, id_produit, date_inventaire: dateISO, qte_perimee: sfPerimesEdite[id_produit] || 0 }) });
      }
      setMessage("Inventaire et perimés enregistres avec succes !");
      setSfDateInventaire(sfSaisieDate);
      setSfEtape(3);
    } catch (err) { setMessage("Erreur de connexion !"); }
  };

  const imprimerSituationFinancierePDF = () => {
    if (!sfSituationData) return;
    const { client, date_inventaire, lignes, totaux } = sfSituationData; // eslint-disable-line no-unused-vars
    const doc = new jsPDF({ orientation: "landscape" });
    const couleur = [13, 110, 253];
    doc.setFillColor(...couleur); doc.rect(0, 0, 297, 25, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("GESTION DE STOCK", 148, 10, { align: "center" });
    doc.setFontSize(12); doc.text("SITUATION FINANCIERE CLIENT", 148, 20, { align: "center" });
    doc.setTextColor(0, 0, 0); doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text(`Client : ${client.nom} (${client.code_client})`, 15, 35);
    doc.text(`Date Inventaire : ${formatDateFR(date_inventaire)}`, 150, 35);
    doc.text(`Solde Initial : ${Number(totaux.solde_initial).toLocaleString("fr-FR")} MRU`, 15, 42);
    doc.text(`Total Versements : ${Number(totaux.total_versements).toLocaleString("fr-FR")} MRU`, 150, 42);
    doc.setDrawColor(...couleur); doc.setLineWidth(0.5); doc.line(15, 47, 282, 47);
    autoTable(doc, {
      startY: 52,
      head: [["Code", "Designation", "Unite", "S.I Client", "Sorties", "S.MAD", "S.INV", "S.PERIMES", "S.V", "Prix Vente", "Valeur S.V"]],
      body: lignes.map((l) => [
        l.code_produit, l.designation, l.unite,
        Number(l.stock_initial_client).toFixed(2),
        Number(l.total_sorties_client).toFixed(2),
        Number(l.s_mad).toFixed(2),
        Number(l.s_inv).toFixed(2),
        Number(l.s_perimes).toFixed(2),
        Number(l.s_v).toFixed(2),
        Number(l.prix_vente).toFixed(2),
        Number(l.valeur_sv).toLocaleString("fr-FR", { minimumFractionDigits: 2 })
      ]),
      foot: [["", "", "", "", "", "", "", "", "", "TOTAL S.V :", Number(totaux.total_valeur_sv).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " MRU"]],
      headStyles: { fillColor: couleur, textColor: 255, fontStyle: "bold", fontSize: 8 },
      footStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [249, 249, 249] },
      styles: { fontSize: 8, cellPadding: 2 },
    });
    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.setFillColor(220, 53, 69); doc.rect(15, finalY, 80, 12, "F");
    doc.setFillColor(25, 135, 84); doc.rect(100, finalY, 80, 12, "F");
    doc.setFillColor(13, 110, 253); doc.rect(185, finalY, 95, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(`Solde Initial : ${Number(totaux.solde_initial).toLocaleString("fr-FR")} MRU`, 55, finalY + 8, { align: "center" });
    doc.text(`Total S.V : ${Number(totaux.total_valeur_sv).toLocaleString("fr-FR")} MRU`, 140, finalY + 8, { align: "center" });
    doc.text(`TOTAL CREANCE : ${Number(totaux.total_creance).toLocaleString("fr-FR")} MRU`, 232, finalY + 8, { align: "center" });
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8); doc.setTextColor(150, 150, 150); doc.setFont("helvetica", "normal");
    doc.text(`Document genere le ${new Date().toLocaleDateString("fr-FR")} a ${new Date().toLocaleTimeString("fr-FR")}`, 148, pageHeight - 8, { align: "center" });
    doc.save(`Situation_Financiere_${client.code_client}_${date_inventaire}.pdf`);
  };

  const renderSituationFinanciere = () => (
    <div>
      <h4 className="mb-4">💰 Situation Financière Client</h4>
      {message && (<div className={`alert ${message.includes("succes") ? "alert-success" : "alert-danger"} alert-dismissible`}>{message}<button className="btn-close" onClick={() => setMessage("")}></button></div>)}

      {/* ETAPE 1 — Sélection client et saisie données */}
      <div className="card p-3 mb-3">
        <div className="row g-3 align-items-end">
          <div className="col-md-4">
            <label className="form-label fw-bold">Client</label>
            <select className="form-select" value={sfClientSelectionne} onChange={(e) => { setSfClientSelectionne(e.target.value); setSfSituationData(null); setSfEtape(1); }}>
              <option value="">-- Choisir un client --</option>
              {clients.map((c) => (<option key={c.id_client} value={c.id_client}>{c.code_client} — {c.nom}</option>))}
            </select>
          </div>
          <div className="col-md-3">
            <button className="btn btn-primary w-100" onClick={chargerStockInitialClient} disabled={!sfClientSelectionne}>📂 Charger les données</button>
          </div>
        </div>
      </div>

      {sfClientSelectionne && sfStockInitialClient.length > 0 && (
        <>
          {/* ONGLETS ETAPES */}
          <ul className="nav nav-tabs mb-3">
            <li className="nav-item"><button className={`nav-link ${sfEtape === 1 ? "active" : ""}`} onClick={() => setSfEtape(1)}>1️⃣ Solde & Stock Initial</button></li>
            <li className="nav-item"><button className={`nav-link ${sfEtape === 2 ? "active" : ""}`} onClick={() => setSfEtape(2)}>2️⃣ Inventaire & Périmés</button></li>
            <li className="nav-item"><button className={`nav-link ${sfEtape === 3 ? "active" : ""}`} onClick={() => setSfEtape(3)}>3️⃣ Situation Financière</button></li>
          </ul>

          {/* ETAPE 1 — Solde initial + Stock initial client */}
          {sfEtape === 1 && (
            <div>
              <div className="card p-3 mb-3 border-primary">
                <h5 className="text-primary mb-3">💰 Solde Initial (Créance début de période)</h5>
                <div className="row g-3">
                  <div className="col-md-3">
                    <label className="form-label">Montant (MRU)</label>
                    <input type="number" min="0" className="form-control" value={sfSoldeInitial.montant} onChange={(e) => setSfSoldeInitial({ ...sfSoldeInitial, montant: e.target.value })} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Date début (jj/mm/aaaa)</label>
                    <input type="text" className={`form-control ${sfSoldeInitial.date_debut && !dateValide(sfSoldeInitial.date_debut) ? "is-invalid" : sfSoldeInitial.date_debut && dateValide(sfSoldeInitial.date_debut) ? "is-valid" : ""}`} placeholder="jj/mm/aaaa" maxLength={10} value={sfSoldeInitial.date_debut} onChange={(e) => setSfSoldeInitial({ ...sfSoldeInitial, date_debut: e.target.value })} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Observation</label>
                    <input type="text" className="form-control" value={sfSoldeInitial.observation} onChange={(e) => setSfSoldeInitial({ ...sfSoldeInitial, observation: e.target.value })} />
                  </div>
                  <div className="col-md-2 d-flex align-items-end">
                    <button className="btn btn-success w-100" onClick={enregistrerSoldeInitial}>💾 Enregistrer</button>
                  </div>
                </div>
              </div>

              <div className="card p-0">
                <div className="card-header bg-info text-white fw-bold">📦 Stock Initial par Produit</div>
                <table className="table table-bordered table-hover mb-0">
                  <thead className="table-dark"><tr><th>Code</th><th>Designation</th><th>Unite</th><th className="text-center">Quantité Initiale</th><th className="text-center">Action</th></tr></thead>
                  <tbody>
                    {sfStockInitialClient.map((p) => (
                      <tr key={p.id_produit}>
                        <td><strong>{p.code_produit}</strong></td><td>{p.designation}</td><td>{p.unite}</td>
                        <td className="text-center">
                          <input type="number" min="0" className="form-control form-control-sm text-center" style={{ width: "120px", margin: "auto" }}
                            value={sfStockInitialEdite[p.id_produit] ?? p.quantite}
                            onChange={(e) => setSfStockInitialEdite({ ...sfStockInitialEdite, [p.id_produit]: e.target.value })} />
                        </td>
                        <td className="text-center">
                          <button className="btn btn-success btn-sm" onClick={() => enregistrerStockInitialClient(p.id_produit)}>💾 Enregistrer</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 text-end">
                <button className="btn btn-primary btn-lg" onClick={() => setSfEtape(2)}>Suivant → Inventaire & Périmés</button>
              </div>
            </div>
          )}

          {/* ETAPE 2 — Inventaire et Périmés */}
          {sfEtape === 2 && (
            <div>
              <div className="card p-3 mb-3 border-warning">
                <div className="row g-3 align-items-end">
                  <div className="col-md-4">
                    <label className="form-label fw-bold">Date Inventaire (jj/mm/aaaa)</label>
                    <input type="text" className={`form-control ${sfSaisieDate && !dateValide(sfSaisieDate) ? "is-invalid" : sfSaisieDate && dateValide(sfSaisieDate) ? "is-valid" : ""}`}
                      placeholder="jj/mm/aaaa" maxLength={10} value={sfSaisieDate}
                      onChange={(e) => setSfSaisieDate(e.target.value)} />
                    {sfSaisieDate && !dateValide(sfSaisieDate) && <div className="invalid-feedback">Date invalide</div>}
                  </div>
                </div>
              </div>

              <div className="card p-0">
                <div className="card-header bg-warning text-dark fw-bold">📋 Inventaire Physique & Périmés par Produit</div>
                <table className="table table-bordered table-hover mb-0">
                  <thead className="table-dark">
                    <tr><th>Code</th><th>Designation</th><th>Unite</th><th className="text-center">S.MAD</th><th className="text-center bg-warning text-dark">S.INV (Inventaire)</th><th className="text-center bg-danger text-white">S.PERIMES (Périmés)</th></tr>
                  </thead>
                  <tbody>
                    {sfStockInitialClient.map((p) => {
                      const si = Number(sfStockInitialEdite[p.id_produit] ?? p.quantite);
                      return (
                        <tr key={p.id_produit}>
                          <td><strong>{p.code_produit}</strong></td><td>{p.designation}</td><td>{p.unite}</td>
                          <td className="text-center fw-bold text-primary">{si}</td>
                          <td className="text-center">
                            <input type="number" min="0" className="form-control form-control-sm text-center" style={{ width: "120px", margin: "auto" }}
                              value={sfInventaireEdite[p.id_produit] ?? 0}
                              onChange={(e) => setSfInventaireEdite({ ...sfInventaireEdite, [p.id_produit]: e.target.value })} />
                          </td>
                          <td className="text-center">
                            <input type="number" min="0" className="form-control form-control-sm text-center" style={{ width: "120px", margin: "auto" }}
                              value={sfPerimesEdite[p.id_produit] ?? 0}
                              onChange={(e) => setSfPerimesEdite({ ...sfPerimesEdite, [p.id_produit]: e.target.value })} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 d-flex justify-content-between">
                <button className="btn btn-secondary" onClick={() => setSfEtape(1)}>← Retour</button>
                <button className="btn btn-success btn-lg" onClick={enregistrerInventaireEtPerimes}>💾 Enregistrer & Calculer →</button>
              </div>
            </div>
          )}

          {/* ETAPE 3 — Situation Financière */}
          {sfEtape === 3 && (
            <div>
              <div className="card p-3 mb-3 border-success">
                <div className="row g-3 align-items-end">
                  <div className="col-md-4">
                    <label className="form-label fw-bold">Date Inventaire (jj/mm/aaaa)</label>
                    <input type="text" className={`form-control ${sfDateInventaire && !dateValide(sfDateInventaire) ? "is-invalid" : sfDateInventaire && dateValide(sfDateInventaire) ? "is-valid" : ""}`}
                      placeholder="jj/mm/aaaa" maxLength={10} value={sfDateInventaire}
                      onChange={(e) => setSfDateInventaire(e.target.value)} />
                  </div>
                  <div className="col-md-3">
                    <button className="btn btn-primary w-100" onClick={chargerSituationFinanciere}>🔍 Afficher la Situation</button>
                  </div>
                </div>
              </div>

              {sfLoading && (<div className="text-center my-4"><div className="spinner-border text-primary"></div></div>)}

              {sfSituationData && !sfLoading && (
                <div className="card p-3">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h5 className="text-primary mb-1">Client : {sfSituationData.client?.nom} ({sfSituationData.client?.code_client})</h5>
                      <small className="text-muted">Date Inventaire : {formatDateFR(sfSituationData.date_inventaire)}</small>
                    </div>
                    <div>
                      <button className="btn btn-secondary me-2" onClick={() => setSfEtape(2)}>← Retour</button>
                      <button className="btn btn-success" onClick={imprimerSituationFinancierePDF}>🖨️ Imprimer PDF</button>
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-3"><div className="card bg-danger text-white text-center p-2"><small>Solde Initial</small><h5>{Number(sfSituationData.totaux.solde_initial).toLocaleString("fr-FR")} MRU</h5></div></div>
                    <div className="col-md-3"><div className="card bg-warning text-dark text-center p-2"><small>Total Valeur S.V</small><h5>{Number(sfSituationData.totaux.total_valeur_sv).toLocaleString("fr-FR")} MRU</h5></div></div>
                    <div className="col-md-3"><div className="card bg-info text-white text-center p-2"><small>Total Versements</small><h5>-{Number(sfSituationData.totaux.total_versements).toLocaleString("fr-FR")} MRU</h5></div></div>
                    <div className="col-md-3"><div className="card bg-primary text-white text-center p-2"><small>CREANCE NETTE</small><h5>{Number(sfSituationData.totaux.creance_nette).toLocaleString("fr-FR")} MRU</h5></div></div>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-bordered table-sm table-hover">
                      <thead className="table-dark">
                        <tr>
                          <th>Code</th><th>Designation</th><th>Unite</th>
                          <th className="text-center text-info">S.I Client</th>
                          <th className="text-center text-success">Sorties</th>
                          <th className="text-center text-primary">S.MAD</th>
                          <th className="text-center text-warning">S.INV</th>
                          <th className="text-center text-danger">S.PERIMES</th>
                          <th className="text-center">S.V</th>
                          <th className="text-center">Prix Vente</th>
                          <th className="text-center fw-bold">Valeur S.V</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sfSituationData.lignes.map((l, i) => (
                          <tr key={i} className={l.s_v < 0 ? "table-danger" : ""}>
                            <td>{l.code_produit}</td><td>{l.designation}</td><td>{l.unite}</td>
                            <td className="text-center">{Number(l.stock_initial_client).toFixed(2)}</td>
                            <td className="text-center text-success">+{Number(l.total_sorties_client).toFixed(2)}</td>
                            <td className="text-center text-primary fw-bold">{Number(l.s_mad).toFixed(2)}</td>
                            <td className="text-center text-warning">{Number(l.s_inv).toFixed(2)}</td>
                            <td className="text-center text-danger">{Number(l.s_perimes).toFixed(2)}</td>
                            <td className="text-center fw-bold">{Number(l.s_v).toFixed(2)}</td>
                            <td className="text-center">{Number(l.prix_vente).toFixed(2)}</td>
                            <td className="text-center fw-bold text-primary">{Number(l.valeur_sv).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="table-dark fw-bold">
                        <tr>
                          <td colSpan="10" className="text-end">TOTAL VALEUR S.V :</td>
                          <td className="text-center text-warning">{Number(sfSituationData.totaux.total_valeur_sv).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MRU</td>
                        </tr>
                        <tr className="table-secondary">
                          <td colSpan="10" className="text-end">+ SOLDE INITIAL :</td>
                          <td className="text-center">{Number(sfSituationData.totaux.solde_initial).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MRU</td>
                        </tr>
                        <tr className="table-warning">
                          <td colSpan="10" className="text-end fw-bold">= TOTAL CREANCE :</td>
                          <td className="text-center fw-bold">{Number(sfSituationData.totaux.total_creance).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MRU</td>
                        </tr>
                        <tr className="table-info">
                          <td colSpan="10" className="text-end">- TOTAL VERSEMENTS :</td>
                          <td className="text-center">{Number(sfSituationData.totaux.total_versements).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MRU</td>
                        </tr>
                        <tr style={{ backgroundColor: "#0d6efd", color: "white" }}>
                          <td colSpan="10" className="text-end fw-bold fs-6">= CREANCE NETTE :</td>
                          <td className="text-center fw-bold fs-6">{Number(sfSituationData.totaux.creance_nette).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MRU</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  {/* SECTION VERSEMENTS */}
                  <div className="card mt-4 border-info">
                    <div className="card-header bg-info text-white d-flex justify-content-between align-items-center">
                      <strong>💳 Versements du Client</strong>
                      <button className="btn btn-light btn-sm" onClick={() => setShowFormVersement(!showFormVersement)}>
                        {showFormVersement ? "Annuler" : "+ Ajouter Versement"}
                      </button>
                    </div>
                    {showFormVersement && (
                      <div className="card-body border-bottom">
                        <div className="row g-2">
                          <div className="col-md-2">
                            <label className="form-label">Date *</label>
                            <input type="text" className={`form-control form-control-sm ${newVersementDate && !dateValide(newVersementDate) ? "is-invalid" : newVersementDate && dateValide(newVersementDate) ? "is-valid" : ""}`} placeholder="jj/mm/aaaa" maxLength={10} value={newVersementDate} onChange={(e) => setNewVersementDate(e.target.value)} />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label">Montant (MRU) *</label>
                            <input type="number" min="0" className="form-control form-control-sm" value={newVersement.montant} onChange={(e) => setNewVersement({ ...newVersement, montant: e.target.value })} />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label">Mode Paiement</label>
                            <select className="form-select form-select-sm" value={newVersement.mode_paiement} onChange={(e) => setNewVersement({ ...newVersement, mode_paiement: e.target.value })}>
                              <option value="">-- Choisir --</option>
                              <option value="Especes">Espèces</option>
                              <option value="Cheque">Chèque</option>
                              <option value="Virement">Virement</option>
                              <option value="Autre">Autre</option>
                            </select>
                          </div>
                          <div className="col-md-2">
                            <label className="form-label">Référence</label>
                            <input type="text" className="form-control form-control-sm" value={newVersement.reference} onChange={(e) => setNewVersement({ ...newVersement, reference: e.target.value })} />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label">Observation</label>
                            <input type="text" className="form-control form-control-sm" value={newVersement.observation} onChange={(e) => setNewVersement({ ...newVersement, observation: e.target.value })} />
                          </div>
                          <div className="col-md-2 d-flex align-items-end">
                            <button className="btn btn-success btn-sm w-100" onClick={ajouterVersement}>💾 Enregistrer</button>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="card-body p-0">
                      {versementsData.length === 0 ? (
                        <p className="text-muted text-center p-3">Aucun versement enregistré</p>
                      ) : (
                        <table className="table table-sm table-bordered mb-0">
                          <thead className="table-info">
                            <tr><th>Date</th><th>Montant (MRU)</th><th>Mode</th><th>Référence</th><th>Observation</th>{isAdmin && <th>Action</th>}</tr>
                          </thead>
                          <tbody>
                            {versementsData.map((v) => (
                              <tr key={v.id_versement}>
                                <td>{formatDateFR(v.date_versement?.substring(0, 10))}</td>
                                <td className="fw-bold text-success">{Number(v.montant).toLocaleString("fr-FR")} MRU</td>
                                <td>{v.mode_paiement}</td>
                                <td>{v.reference}</td>
                                <td>{v.observation}</td>
                                {isAdmin && <td><button className="btn btn-danger btn-sm" onClick={() => supprimerVersement(v.id_versement)}>🗑️</button></td>}
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="table-success fw-bold">
                            <tr>
                              <td className="text-end">TOTAL :</td>
                              <td className="text-success">{Number(sfSituationData.totaux.total_versements).toLocaleString("fr-FR")} MRU</td>
                              <td colSpan={isAdmin ? 4 : 3}></td>
                            </tr>
                          </tfoot>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );

  const colonnes = { stock: ["code_produit", "designation", "unite", "stock_initial", "total_entree", "total_sortie", "stock_actuel"], produits: ["code_produit", "designation", "unite", "prix_achat", "prix_vente", "stock_minimum"], clients: ["code_client", "nom", "telephone", "adresse"], fournisseurs: ["code_fournisseur", "nom", "telephone", "adresse"], "liste-entree": ["numero_bon", "date_bon", "nom_fournisseur", "observation"], "liste-sortie": ["numero_bon", "date_bon", "nom_client", "observation"] };
  const idCols = { produits: "id_produit", clients: "id_client", fournisseurs: "id_fournisseur" };
  const titres = { stock: "Stock Actuel", produits: "Produits", clients: "Clients", fournisseurs: "Fournisseurs", "bon-entree": "Nouveau Bon d'Entree", "bon-sortie": "Nouveau Bon de Sortie", "liste-entree": "Liste des Bons d'Entree", "liste-sortie": "Liste des Bons de Sortie", "graphiques": "Graphiques", "mouvements": "Fiche Mouvements", "fiche-stock": "Fiche de Stock", "stock-initial": "Stock Initial", "situation-financiere": "Situation Financiere Client", ...(isAdmin ? { "utilisateurs": "Utilisateurs" } : {}) };
  const donneesFiltrees = donnees.filter((d) => Object.values(d).some((v) => String(v).toLowerCase().includes(recherche.toLowerCase())));

  const renderFormAjout = () => {
    if (page === "produits") return (<div className="card p-3 mb-3"><h5 className="mb-3">Nouveau Produit</h5><div className="row g-2"><div className="col-md-2"><input className="form-control" placeholder="Code *" value={newProduit.code_produit} onChange={(e) => setNewProduit({ ...newProduit, code_produit: e.target.value })} /></div><div className="col-md-3"><input className="form-control" placeholder="Designation *" value={newProduit.designation} onChange={(e) => setNewProduit({ ...newProduit, designation: e.target.value })} /></div><div className="col-md-1"><input className="form-control" placeholder="Unite" value={newProduit.unite} onChange={(e) => setNewProduit({ ...newProduit, unite: e.target.value })} /></div><div className="col-md-2"><input className="form-control" type="number" placeholder="Prix Achat" value={newProduit.prix_achat} onChange={(e) => setNewProduit({ ...newProduit, prix_achat: e.target.value })} /></div><div className="col-md-2"><input className="form-control" type="number" placeholder="Prix Vente" value={newProduit.prix_vente} onChange={(e) => setNewProduit({ ...newProduit, prix_vente: e.target.value })} /></div><div className="col-md-2"><input className="form-control" type="number" placeholder="Stock Min" value={newProduit.stock_minimum} onChange={(e) => setNewProduit({ ...newProduit, stock_minimum: e.target.value })} /></div></div><div className="mt-2"><button className="btn btn-success me-2" onClick={ajouterElement}>Enregistrer</button><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Annuler</button></div></div>);
    if (page === "clients") return (<div className="card p-3 mb-3"><h5 className="mb-3">Nouveau Client</h5><div className="row g-2"><div className="col-md-2"><input className="form-control" placeholder="Code *" value={newClient.code_client} onChange={(e) => setNewClient({ ...newClient, code_client: e.target.value })} /></div><div className="col-md-3"><input className="form-control" placeholder="Nom *" value={newClient.nom} onChange={(e) => setNewClient({ ...newClient, nom: e.target.value })} /></div><div className="col-md-3"><input className="form-control" placeholder="Telephone" value={newClient.telephone} onChange={(e) => setNewClient({ ...newClient, telephone: e.target.value })} /></div><div className="col-md-4"><input className="form-control" placeholder="Adresse" value={newClient.adresse} onChange={(e) => setNewClient({ ...newClient, adresse: e.target.value })} /></div></div><div className="mt-2"><button className="btn btn-success me-2" onClick={ajouterElement}>Enregistrer</button><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Annuler</button></div></div>);
    if (page === "fournisseurs") return (<div className="card p-3 mb-3"><h5 className="mb-3">Nouveau Fournisseur</h5><div className="row g-2"><div className="col-md-2"><input className="form-control" placeholder="Code *" value={newFournisseur.code_fournisseur} onChange={(e) => setNewFournisseur({ ...newFournisseur, code_fournisseur: e.target.value })} /></div><div className="col-md-3"><input className="form-control" placeholder="Nom *" value={newFournisseur.nom} onChange={(e) => setNewFournisseur({ ...newFournisseur, nom: e.target.value })} /></div><div className="col-md-3"><input className="form-control" placeholder="Telephone" value={newFournisseur.telephone} onChange={(e) => setNewFournisseur({ ...newFournisseur, telephone: e.target.value })} /></div><div className="col-md-4"><input className="form-control" placeholder="Adresse" value={newFournisseur.adresse} onChange={(e) => setNewFournisseur({ ...newFournisseur, adresse: e.target.value })} /></div></div><div className="mt-2"><button className="btn btn-success me-2" onClick={ajouterElement}>Enregistrer</button><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Annuler</button></div></div>);
  };

  const renderFormulaireBon = (type) => (
    <div className="card p-4">
      <h4 className="mb-4">{type === "bon-entree" ? "Nouveau Bon d'Entree" : "Nouveau Bon de Sortie"}</h4>
      {message && <div className={`alert ${message.includes("succes") ? "alert-success" : "alert-danger"}`}>{message}</div>}
      <div className="row mb-3">
        <div className="col-md-4"><label className="form-label">Numero Bon *</label><input type="text" className="form-control" value={bon.numero_bon} onChange={(e) => setBon({ ...bon, numero_bon: e.target.value })} /></div>
        <div className="col-md-4"><label className="form-label">Date * (jj/mm/aaaa)</label><input type="text" className={`form-control ${saisieDate && !dateValide(saisieDate) ? "is-invalid" : saisieDate && dateValide(saisieDate) ? "is-valid" : ""}`} placeholder="jj/mm/aaaa" maxLength={10} value={saisieDate} onChange={(e) => { setSaisieDate(e.target.value); if (dateValide(e.target.value)) setBon({ ...bon, date_bon: parseFR(e.target.value) }); }} />{saisieDate && !dateValide(saisieDate) && <div className="invalid-feedback">Date invalide (ex: 19/05/2026)</div>}</div>
        <div className="col-md-4">{type === "bon-entree" ? (<><label className="form-label">Fournisseur *</label><select className="form-select" value={bon.id_fournisseur} onChange={(e) => setBon({ ...bon, id_fournisseur: e.target.value })}><option value="">-- Choisir --</option>{fournisseurs.map((f) => <option key={f.id_fournisseur} value={f.id_fournisseur}>{f.nom}</option>)}</select></>) : (<><label className="form-label">Client *</label><select className="form-select" value={bon.id_client} onChange={(e) => setBon({ ...bon, id_client: e.target.value })}><option value="">-- Choisir --</option>{clients.map((c) => <option key={c.id_client} value={c.id_client}>{c.nom}</option>)}</select></>)}</div>
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
    if (!bonEnEdition) return null; const type = bonEnEdition._type;
    return (
      <div className="card p-4 border-warning">
        <div className="d-flex justify-content-between align-items-center mb-4"><h4 className="text-warning">✏️ Modifier le Bon : {bonEnEdition.numero_bon}</h4><button className="btn btn-secondary" onClick={() => { setShowEditBon(false); setBonEnEdition(null); }}>Annuler</button></div>
        {message && <div className={`alert ${message.includes("succes") ? "alert-success" : "alert-danger"}`}>{message}</div>}
        <div className="row mb-3">
          <div className="col-md-4"><label className="form-label">Numero Bon *</label><input type="text" className="form-control" value={bonEnEdition.numero_bon} onChange={(e) => setBonEnEdition({ ...bonEnEdition, numero_bon: e.target.value })} /></div>
          <div className="col-md-4"><label className="form-label">Date * (jj/mm/aaaa)</label><input type="text" className="form-control" placeholder="jj/mm/aaaa" maxLength={10} value={saisieEditionDate || (bonEnEdition.date_bon ? formatDateFR(bonEnEdition.date_bon.substring(0, 10)) : "")} onChange={(e) => { setSaisieEditionDate(e.target.value); if (dateValide(e.target.value)) setBonEnEdition({ ...bonEnEdition, date_bon: parseFR(e.target.value) }); }} /></div>
          <div className="col-md-4">{type === "entree" ? (<><label className="form-label">Fournisseur *</label><select className="form-select" value={bonEnEdition.id_fournisseur} onChange={(e) => setBonEnEdition({ ...bonEnEdition, id_fournisseur: e.target.value })}><option value="">-- Choisir --</option>{fournisseurs.map((f) => <option key={f.id_fournisseur} value={f.id_fournisseur}>{f.nom}</option>)}</select></>) : (<><label className="form-label">Client *</label><select className="form-select" value={bonEnEdition.id_client} onChange={(e) => setBonEnEdition({ ...bonEnEdition, id_client: e.target.value })}><option value="">-- Choisir --</option>{clients.map((c) => <option key={c.id_client} value={c.id_client}>{c.nom}</option>)}</select></>)}</div>
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
              {isAdmin && <button className="btn btn-warning me-2" onClick={() => ouvrirModificationBon(bonDetail, type)}>✏️ Modifier</button>}
              {isAdmin && <button className="btn btn-danger me-2" onClick={() => supprimerBon(type === "entree" ? bonDetail.id_bon_entree : bonDetail.id_bon_sortie, type)}>🗑️ Supprimer</button>}
              <button className="btn btn-secondary" onClick={() => setBonDetail(null)}>Retour</button>
            </div>
          </div>
          <div className="row mb-3"><div className="col-md-3"><strong>Numero :</strong> {bonDetail.numero_bon}</div><div className="col-md-3"><strong>Date :</strong> {formatDateFR(bonDetail.date_bon?.substring(0, 10))}</div><div className="col-md-3"><strong>{type === "entree" ? "Fournisseur" : "Client"} :</strong> {type === "entree" ? bonDetail.nom_fournisseur : bonDetail.nom_client}</div><div className="col-md-3"><strong>Observation :</strong> {bonDetail.observation}</div></div>
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
              <tbody>{donneesFiltrees.map((d, i) => (<tr key={i}>{colonnes[page].map((col) => <td key={col}>{col.includes("date") ? formatDateFR(d[col]?.substring(0, 10)) : d[col]}</td>)}<td className="text-center"><button className="btn btn-primary btn-sm me-2" onClick={() => voirDetailBon(d, type)}>Detail</button>{isAdmin && <button className="btn btn-warning btn-sm me-2" onClick={() => ouvrirModificationBon(d, type)}>✏️ Modifier</button>}{isAdmin && <button className="btn btn-danger btn-sm" onClick={() => supprimerBon(type === "entree" ? d.id_bon_entree : d.id_bon_sortie, type)}>🗑️ Supprimer</button>}</td></tr>))}</tbody>
            </table>
          )}
        </>
      )}
    </>
  );

  if (!token) return renderLogin();

  return (
    <div>
      <nav className="navbar navbar-dark bg-primary px-4 mb-4 d-flex justify-content-between">
        <span className="navbar-brand fw-bold fs-4">📦 Gestion de Stock</span>
        <div className="d-flex align-items-center">
          <span className="text-white me-3">{isAdmin ? "👑" : "👤"} <strong>{utilisateur?.nom}</strong><span className={`badge ms-2 ${isAdmin ? "bg-warning text-dark" : "bg-light text-dark"}`}>{isAdmin ? "Admin" : "Utilisateur"}</span></span>
          <button className="btn btn-outline-light btn-sm" onClick={seDeconnecter}>🚪 Deconnexion</button>
        </div>
      </nav>

      {totalAlertes > 0 && (
        <div className="alert alert-danger mx-3 mb-0 d-flex justify-content-between align-items-center" style={{ borderRadius: 0, cursor: "pointer" }} onClick={() => setShowAlertes(!showAlertes)}>
          <span>🚨 <strong>{totalAlertes} alerte(s) de stock :</strong>{produitsRuptureTotale.length > 0 && <span className="badge bg-danger ms-2">{produitsRuptureTotale.length} rupture(s) totale(s)</span>}{produitsStockFaible.length > 0 && <span className="badge bg-warning text-dark ms-2">{produitsStockFaible.length} stock(s) faible(s)</span>}</span>
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
            <ResponsiveContainer width="100%" height={250}><BarChart data={dataStockActuel} margin={{ top: 5, right: 20, left: 0, bottom: 50 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} tick={{ fontSize: 11 }} /><YAxis /><Tooltip labelFormatter={(l) => { const i = dataStockActuel.find((d) => d.name === l); return i ? i.designation : l; }} /><Legend verticalAlign="top" /><Bar dataKey="Stock Actuel" fill="#0d6efd" radius={[4, 4, 0, 0]} /><Bar dataKey="Stock Minimum" fill="#ffc107" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
          </div>
        )}

        <div className="mb-4">
          {Object.keys(titres).map((p) => (
            <button key={p} onClick={() => { setPage(p); resetBon(); setBonDetail(null); setShowEditBon(false); setFicheMouvements(null); setProduitSelectionne(""); setFicheStockData(null); setStockInitialEnEdition(null); }}
              className={`btn me-2 mb-2 ${page === p ? "btn-primary" : "btn-secondary"}`}>
              {p === "graphiques" ? "📊 " : p === "mouvements" ? "📋 " : p === "fiche-stock" ? "📊 " : p === "stock-initial" ? "📦 " : p === "utilisateurs" ? "👥 " : p === "situation-financiere" ? "💰 " : ""}{titres[p]}
            </button>
          ))}
        </div>

        {page === "graphiques" ? renderGraphiques()
          : page === "mouvements" ? renderMouvements()
          : page === "fiche-stock" ? renderFicheStock()
          : page === "stock-initial" ? renderStockInitial()
          : page === "situation-financiere" ? renderSituationFinanciere()
          : page === "utilisateurs" && isAdmin ? renderUtilisateurs()
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
                  <tbody>{donneesFiltrees.map((d, i) => (<tr key={i}>{colonnes[page] && colonnes[page].map((col) => (<td key={col}>{d[col]}</td>))}{["produits", "clients", "fournisseurs"].includes(page) && (<td className="text-center">{isAdmin && <button className="btn btn-warning btn-sm me-2" onClick={() => ouvrirModification(d)}>✏️ Modifier</button>}{isAdmin && <button className="btn btn-danger btn-sm" onClick={() => supprimerElement(d[idCols[page]])}>🗑️ Supprimer</button>}{!isAdmin && <span className="text-muted small">Consultation seulement</span>}</td>)}</tr>))}</tbody>
                </table>
              )}
            </>
          )}
      </div>

      {showEditModal && elementAModifier && isAdmin && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg"><div className="modal-content">
            <div className="modal-header bg-warning"><h5 className="modal-title">✏️ Modifier {page === "produits" ? "Produit" : page === "clients" ? "Client" : "Fournisseur"}</h5><button className="btn-close" onClick={() => setShowEditModal(false)}></button></div>
            <div className="modal-body">
              {page === "produits" && (<div className="row g-3"><div className="col-md-2"><label className="form-label">Code</label><input className="form-control" value={elementAModifier.code_produit || ""} onChange={(e) => setElementAModifier({ ...elementAModifier, code_produit: e.target.value })} /></div><div className="col-md-4"><label className="form-label">Designation</label><input className="form-control" value={elementAModifier.designation || ""} onChange={(e) => setElementAModifier({ ...elementAModifier, designation: e.target.value })} /></div><div className="col-md-2"><label className="form-label">Unite</label><input className="form-control" value={elementAModifier.unite || ""} onChange={(e) => setElementAModifier({ ...elementAModifier, unite: e.target.value })} /></div><div className="col-md-2"><label className="form-label">Prix Achat</label><input type="number" className="form-control" value={elementAModifier.prix_achat || ""} onChange={(e) => setElementAModifier({ ...elementAModifier, prix_achat: e.target.value })} /></div><div className="col-md-2"><label className="form-label">Prix Vente</label><input type="number" className="form-control" value={elementAModifier.prix_vente || ""} onChange={(e) => setElementAModifier({ ...elementAModifier, prix_vente: e.target.value })} /></div><div className="col-md-2"><label className="form-label">Stock Minimum</label><input type="number" className="form-control" value={elementAModifier.stock_minimum || ""} onChange={(e) => setElementAModifier({ ...elementAModifier, stock_minimum: e.target.value })} /></div></div>)}
              {(page === "clients" || page === "fournisseurs") && (<div className="row g-3"><div className="col-md-3"><label className="form-label">Code</label><input className="form-control" value={elementAModifier[page === "clients" ? "code_client" : "code_fournisseur"] || ""} onChange={(e) => setElementAModifier({ ...elementAModifier, [page === "clients" ? "code_client" : "code_fournisseur"]: e.target.value })} /></div><div className="col-md-3"><label className="form-label">Nom</label><input className="form-control" value={elementAModifier.nom || ""} onChange={(e) => setElementAModifier({ ...elementAModifier, nom: e.target.value })} /></div><div className="col-md-3"><label className="form-label">Telephone</label><input className="form-control" value={elementAModifier.telephone || ""} onChange={(e) => setElementAModifier({ ...elementAModifier, telephone: e.target.value })} /></div><div className="col-md-3"><label className="form-label">Adresse</label><input className="form-control" value={elementAModifier.adresse || ""} onChange={(e) => setElementAModifier({ ...elementAModifier, adresse: e.target.value })} /></div></div>)}
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Annuler</button><button className="btn btn-warning" onClick={enregistrerModification}>💾 Enregistrer</button></div>
          </div></div>
        </div>
      )}
    </div>
  );
}

export default App;