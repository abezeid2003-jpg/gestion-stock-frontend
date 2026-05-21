import { useState, useEffect } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const [page, setPage] = useState("stock");
  const [donnees, setDonnees] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ produits: 0, clients: 0, fournisseurs: 0, rupture: 0 });
  const [fournisseurs, setFournisseurs] = useState([]);
  const [clients, setClients] = useState([]);
  const [produits, setProduits] = useState([]);
  const [bon, setBon] = useState({ numero_bon: "", date_bon: "", id_fournisseur: "", id_client: "", observation: "" });
  const [lignes, setLignes] = useState([{ id_produit: "", quantite: "", prix_unitaire: "" }]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("https://gestion-stock-backend-5qm3.onrender.com/produits").then((r) => r.json()),
      fetch("https://gestion-stock-backend-5qm3.onrender.com/clients").then((r) => r.json()),
      fetch("https://gestion-stock-backend-5qm3.onrender.com/fournisseurs").then((r) => r.json()),
      fetch("https://gestion-stock-backend-5qm3.onrender.com/stock").then((r) => r.json()),
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
  }, []);

  useEffect(() => {
    if (page === "bon-entree" || page === "bon-sortie") return;
    setLoading(true);
    setDonnees([]);
    setRecherche("");
    fetch(`https://gestion-stock-backend-5qm3.onrender.com/${page}`)
      .then((res) => res.json())
      .then((data) => {
        setDonnees(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page]);

  const resetBon = () => {
    setBon({ numero_bon: "", date_bon: "", id_fournisseur: "", id_client: "", observation: "" });
    setLignes([{ id_produit: "", quantite: "", prix_unitaire: "" }]);
    setMessage("");
  };

  const ajouterLigne = () => {
    setLignes([...lignes, { id_produit: "", quantite: "", prix_unitaire: "" }]);
  };

  const supprimerLigne = (index) => {
    setLignes(lignes.filter((_, i) => i !== index));
  };

  const modifierLigne = (index, champ, valeur) => {
    const newLignes = [...lignes];
    newLignes[index][champ] = valeur;
    setLignes(newLignes);
  };

  const soumettreBon = async (type) => {
    if (!bon.numero_bon || !bon.date_bon) {
      setMessage("Veuillez remplir tous les champs obligatoires !");
      return;
    }
    if (type === "bon-entree" && !bon.id_fournisseur) {
      setMessage("Veuillez choisir un fournisseur !");
      return;
    }
    if (type === "bon-sortie" && !bon.id_client) {
      setMessage("Veuillez choisir un client !");
      return;
    }

    const body = type === "bon-entree"
      ? { numero_bon: bon.numero_bon, date_bon: bon.date_bon, id_fournisseur: bon.id_fournisseur, observation: bon.observation, lignes }
      : { numero_bon: bon.numero_bon, date_bon: bon.date_bon, id_client: bon.id_client, observation: bon.observation, lignes };

    try {
      const response = await fetch(`https://gestion-stock-backend-5qm3.onrender.com/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.success) {
        setMessage("Bon enregistre avec succes !");
        resetBon();
      } else {
        setMessage("Erreur : " + data.error);
      }
    } catch (err) {
      setMessage("Erreur de connexion !");
    }
  };

  const colonnes = {
    stock: ["code_produit", "designation", "unite", "total_entree", "total_sortie", "stock_actuel"],
    produits: ["code_produit", "designation", "unite", "prix_achat", "prix_vente"],
    clients: ["code_client", "nom", "telephone", "adresse"],
    fournisseurs: ["code_fournisseur", "nom", "telephone", "adresse"],
  };

  const titres = {
    stock: "Stock Actuel",
    produits: "Produits",
    clients: "Clients",
    fournisseurs: "Fournisseurs",
    "bon-entree": "Bon d'Entree",
    "bon-sortie": "Bon de Sortie",
  };

  const donneesFiltrees = donnees.filter((d) =>
    Object.values(d).some((v) =>
      String(v).toLowerCase().includes(recherche.toLowerCase())
    )
  );

  const renderFormulaire = (type) => (
    <div className="card p-4">
      <h4 className="mb-4">{type === "bon-entree" ? "Nouveau Bon d'Entree" : "Nouveau Bon de Sortie"}</h4>

      {message && (
        <div className={`alert ${message.includes("succes") ? "alert-success" : "alert-danger"}`}>
          {message}
        </div>
      )}

      <div className="row mb-3">
        <div className="col-md-4">
          <label className="form-label">Numero Bon *</label>
          <input type="text" className="form-control"
            value={bon.numero_bon}
            onChange={(e) => setBon({ ...bon, numero_bon: e.target.value })}
            placeholder={type === "bon-entree" ? "Ex: BE003" : "Ex: BS002"} />
        </div>
        <div className="col-md-4">
          <label className="form-label">Date *</label>
          <input type="date" className="form-control"
            value={bon.date_bon}
            onChange={(e) => setBon({ ...bon, date_bon: e.target.value })} />
        </div>
        <div className="col-md-4">
          {type === "bon-entree" ? (
            <>
              <label className="form-label">Fournisseur *</label>
              <select className="form-select"
                value={bon.id_fournisseur}
                onChange={(e) => setBon({ ...bon, id_fournisseur: e.target.value })}>
                <option value="">-- Choisir --</option>
                {fournisseurs.map((f) => (
                  <option key={f.id_fournisseur} value={f.id_fournisseur}>{f.nom}</option>
                ))}
              </select>
            </>
          ) : (
            <>
              <label className="form-label">Client *</label>
              <select className="form-select"
                value={bon.id_client}
                onChange={(e) => setBon({ ...bon, id_client: e.target.value })}>
                <option value="">-- Choisir --</option>
                {clients.map((c) => (
                  <option key={c.id_client} value={c.id_client}>{c.nom}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label">Observation</label>
        <input type="text" className="form-control"
          value={bon.observation}
          onChange={(e) => setBon({ ...bon, observation: e.target.value })} />
      </div>

      <h5 className="mb-3">Produits</h5>
      <table className="table table-bordered">
        <thead className="table-dark">
          <tr>
            <th>Produit</th>
            <th>Quantite</th>
            <th>Prix Unitaire</th>
            <th>Montant</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne, index) => (
            <tr key={index}>
              <td>
                <select className="form-select"
                  value={ligne.id_produit}
                  onChange={(e) => modifierLigne(index, "id_produit", e.target.value)}>
                  <option value="">-- Choisir --</option>
                  {produits.map((p) => (
                    <option key={p.id_produit} value={p.id_produit}>{p.designation}</option>
                  ))}
                </select>
              </td>
              <td>
                <input type="number" className="form-control"
                  value={ligne.quantite}
                  onChange={(e) => modifierLigne(index, "quantite", e.target.value)} />
              </td>
              <td>
                <input type="number" className="form-control"
                  value={ligne.prix_unitaire}
                  onChange={(e) => modifierLigne(index, "prix_unitaire", e.target.value)} />
              </td>
              <td className="text-center align-middle">
                {(ligne.quantite * ligne.prix_unitaire) || 0} MRU
              </td>
              <td className="text-center align-middle">
                <button className="btn btn-danger btn-sm"
                  onClick={() => supprimerLigne(index)}>X</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button className="btn btn-secondary mb-3" onClick={ajouterLigne}>
        + Ajouter une ligne
      </button>

      <div>
        <button className="btn btn-success btn-lg" onClick={() => soumettreBon(type)}>
          Enregistrer le Bon
        </button>
      </div>
    </div>
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
              <div className="card-body text-center">
                <h2>{stats.produits}</h2>
                <p className="mb-0">Produits</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-white bg-success mb-3">
              <div className="card-body text-center">
                <h2>{stats.clients}</h2>
                <p className="mb-0">Clients</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-white bg-info mb-3">
              <div className="card-body text-center">
                <h2>{stats.fournisseurs}</h2>
                <p className="mb-0">Fournisseurs</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-white bg-danger mb-3">
              <div className="card-body text-center">
                <h2>{stats.rupture}</h2>
                <p className="mb-0">Rupture Stock</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          {Object.keys(titres).map((p) => (
            <button
              key={p}
              onClick={() => { setPage(p); resetBon(); }}
              className={`btn me-2 mb-2 ${page === p ? "btn-primary" : "btn-secondary"}`}
            >
              {titres[p]}
            </button>
          ))}
        </div>

        {page === "bon-entree" || page === "bon-sortie" ? (
          renderFormulaire(page)
        ) : (
          <>
            <h4 className="mb-3">{titres[page]}</h4>
            <input type="text" className="form-control mb-3"
              placeholder="Rechercher..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)} />

            {loading ? (
              <div className="text-center">
                <div className="spinner-border text-primary" role="status"></div>
              </div>
            ) : (
              <table className="table table-bordered table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    {colonnes[page] && colonnes[page].map((col) => (
                      <th key={col}>{col.replace(/_/g, " ").toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {donneesFiltrees.map((d, i) => (
                    <tr key={i}>
                      {colonnes[page] && colonnes[page].map((col) => (
                        <td key={col}>{d[col]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;